import hljs from 'highlight.js/lib/core'

import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import scala from 'highlight.js/lib/languages/scala'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import css from 'highlight.js/lib/languages/css'
import scss from 'highlight.js/lib/languages/scss'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('php', php)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('scala', scala)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('css', css)
hljs.registerLanguage('scss', scss)
hljs.registerLanguage('plaintext', plaintext)

const EXTENSION_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  pyw: 'python',
  pyi: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  'c++': 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp',
  c: 'cpp',
  h: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  jsonc: 'json',
  xml: 'xml',
  html: 'xml',
  htm: 'xml',
  svg: 'xml',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  md: 'markdown',
  markdown: 'markdown',
  sql: 'sql',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  sc: 'scala',
  txt: 'plaintext',
  text: 'plaintext',
  log: 'plaintext',
  env: 'bash',
  gitignore: 'plaintext',
  dockerignore: 'plaintext',
}

export function detectLanguage(filePath: string): string {
  const fileName = filePath.split('/').pop() || ''
  
  if (fileName.startsWith('.')) {
    const specialFiles: Record<string, string> = {
      '.gitignore': 'plaintext',
      '.dockerignore': 'plaintext',
      '.env': 'bash',
      '.bashrc': 'bash',
      '.zshrc': 'bash',
    }
    if (specialFiles[fileName]) {
      return specialFiles[fileName]
    }
  }
  
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? EXTENSION_MAP[ext] || 'plaintext' : 'plaintext'
}

export function highlightCode(code: string, language: string): string {
  try {
    if (language && language !== 'plaintext' && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value
    }
  } catch (e) {
    console.error('Highlight error:', e)
  }
  
  return hljs.highlight(code, { language: 'plaintext' }).value
}

export function isImageFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext || '')
}

export function addLineNumbers(code: string): string {
  const lines = code.split('\n')
  const maxLineNum = lines.length
  const padding = maxLineNum.toString().length
  
  return lines
    .map((line, i) => {
      const lineNum = (i + 1).toString().padStart(padding, ' ')
      return `<span class="line-number">${lineNum}</span>${line}`
    })
    .join('\n')
}
