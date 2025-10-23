#!/usr/bin/env bun

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, delimiter } from 'node:path'
import { createOpencode } from '@opencode-ai/sdk'

if (typeof globalThis.Bun === 'undefined') {
  console.error('opencode-web requires the Bun runtime. Run via `bunx opencode-web` or install Bun from https://bun.sh.')
  process.exit(1)
}

const DEFAULT_PORT = 3000
const DEFAULT_HOST = '127.0.0.1'

const usage = `Usage: opencode-web [options]

Options:
  -p, --port <number>           Port for the web UI (default: 3000)
  -H, --host <hostname>         Host/interface to bind both web UI and OpenCode server (default: 127.0.0.1)
      --external-server <url>   Use an existing OpenCode Server
      --no-bundled-server       Skip launching the bundled OpenCode Server
  -h, --help                    Show this help message
`

const printUsage = () => {
  console.log(usage)
}

const parseArgs = (argv) => {
  const options = {
    port: undefined,
    host: undefined,
    externalServerUrl: undefined,
    disableBundledServer: false,
    showHelp: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i]
    if (!raw.startsWith('-')) {
      throw new Error(`Unexpected argument: ${raw}`)
    }

    const eqIndex = raw.indexOf('=')
    const flag = eqIndex >= 0 ? raw.slice(0, eqIndex) : raw
    let attachedValueUsed = false
    const attachedValue = eqIndex >= 0 ? raw.slice(eqIndex + 1) : undefined

    const readValue = (name) => {
      if (!attachedValueUsed && attachedValue !== undefined) {
        attachedValueUsed = true
        return attachedValue
      }
      if (i + 1 >= argv.length) {
        throw new Error(`Flag ${name} requires a value`)
      }
      i += 1
      return argv[i]
    }

    const ensureNoValue = (name) => {
      if (!attachedValueUsed && attachedValue !== undefined) {
        throw new Error(`Flag ${name} does not take a value`)
      }
    }

    switch (flag) {
      case '--port':
      case '-p': {
        const value = readValue(flag)
        const parsed = Number.parseInt(value, 10)
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`Invalid port: ${value}`)
        }
        options.port = parsed
        break
      }
      case '--host':
      case '-H': {
        const value = readValue(flag)
        options.host = value
        break
      }
      case '--external-server':
      case '-s': {
        const value = readValue(flag)
        options.externalServerUrl = value
        break
      }
      case '--no-bundled-server':
      case '--disable-bundled-server': {
        ensureNoValue(flag)
        options.disableBundledServer = true
        break
      }
      case '--help':
      case '-h': {
        ensureNoValue(flag)
        options.showHelp = true
        break
      }
      case '--': {
        return options
      }
      default: {
        throw new Error(`Unknown flag: ${flag}`)
      }
    }
  }

  return options
}

const isTruthy = (value) => {
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
  }
  return Boolean(value)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = dirname(__dirname)
process.chdir(packageDir)

const localBinDir = join(packageDir, 'node_modules', '.bin')
if (existsSync(localBinDir)) {
  const currentPath = process.env.PATH ?? ''
  const segments = currentPath.split(delimiter).filter(Boolean)
  if (!segments.includes(localBinDir)) {
    process.env.PATH = currentPath ? `${localBinDir}${delimiter}${currentPath}` : localBinDir
  }
}

let cliOptions
try {
  cliOptions = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(`[ERROR] ${(error instanceof Error ? error.message : String(error))}`)
  printUsage()
  process.exit(1)
}

if (cliOptions.showHelp) {
  printUsage()
  process.exit(0)
}

const parsePort = (value) => {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

const envPort = parsePort(process.env.PORT)
const port = cliOptions.port ?? envPort ?? DEFAULT_PORT
const host = cliOptions.host ?? process.env.HOST ?? DEFAULT_HOST

process.env.PORT = port.toString()
process.env.HOST = host
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

const envDisableBundledServer = isTruthy(process.env.OPENCODE_WEB_DISABLE_BUNDLED_SERVER)
const disableBundledServer = Boolean(cliOptions.externalServerUrl) || cliOptions.disableBundledServer || envDisableBundledServer

let externalServerUrl = cliOptions.externalServerUrl
if (!externalServerUrl && disableBundledServer) {
  externalServerUrl = process.env.VITE_OPENCODE_SERVER_URL
}

if (disableBundledServer && !externalServerUrl) {
  console.error('[ERROR] Bundled OpenCode Server disabled but no external server URL provided.')
  console.error('       Use --external-server <url> or set VITE_OPENCODE_SERVER_URL.')
  process.exit(1)
}

if (externalServerUrl) {
  process.env.VITE_OPENCODE_SERVER_URL = externalServerUrl
  process.env.OPENCODE_SERVER_URL = externalServerUrl
}

const shouldStartBundledServer = !disableBundledServer && !externalServerUrl
let stopOpencodeServer

if (shouldStartBundledServer) {
  console.log('Starting bundled OpenCode Server via SDK...')

  const serverOptions = {}
  const requestedPort = process.env.OPENCODE_SERVER_PORT
  const requestedHost = process.env.OPENCODE_SERVER_HOSTNAME

  if (requestedPort) {
    const parsedPort = Number.parseInt(requestedPort, 10)
    if (Number.isNaN(parsedPort)) {
      console.warn(`[WARN] Ignoring invalid OPENCODE_SERVER_PORT value: ${requestedPort}`)
    } else {
      serverOptions.port = parsedPort
    }
  }

  if (requestedHost) {
    serverOptions.hostname = requestedHost
  } else if (host && host !== '127.0.0.1') {
    // If --host is specified and not the default, use it for the OpenCode server too
    serverOptions.hostname = host
  }

  try {
    const { server } = await createOpencode(serverOptions)
    process.env.VITE_OPENCODE_SERVER_URL = server.url
    process.env.OPENCODE_SERVER_URL = server.url
    stopOpencodeServer = () => {
      server.close()
      stopOpencodeServer = undefined
    }
    console.log(`OpenCode Server listening at ${server.url}`)
  } catch (error) {
    console.error('[ERROR] Failed to start bundled OpenCode Server.')
    console.error(error instanceof Error ? error.stack ?? error.message : error)
    process.exit(1)
  }
} else if (externalServerUrl) {
  console.log(`ℹ️ Using external OpenCode Server: ${externalServerUrl}`)
} else {
  console.log('ℹ️ Bundled OpenCode Server disabled via OPENCODE_WEB_DISABLE_BUNDLED_SERVER.')
}

const cleanup = () => {
  if (stopOpencodeServer) {
    stopOpencodeServer()
  }
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

process.on('exit', cleanup)

const displayHost = host === '0.0.0.0' ? '0.0.0.0' : host
console.log(`Starting OpenCode Web server on http://${displayHost}:${port}`)
if (host === '0.0.0.0') {
  console.log('Listening on all network interfaces')
}
console.log(`Serving from: ${packageDir}`)

const serverPath = join(packageDir, 'server.ts')
await import(serverPath)
