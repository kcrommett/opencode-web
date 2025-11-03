#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

function detectPlatformAndArch() {
  let platform;
  switch (os.platform()) {
    case 'darwin':
      platform = 'darwin';
      break;
    case 'linux':
      platform = 'linux';
      break;
    case 'win32':
      platform = 'windows';
      break;
    default:
      platform = os.platform();
      break;
  }

  let arch;
  switch (os.arch()) {
    case 'x64':
      arch = 'x64';
      break;
    case 'arm64':
      arch = 'arm64';
      break;
    case 'arm':
      arch = 'arm';
      break;
    default:
      arch = os.arch();
      break;
  }

  return { platform, arch };
}

function ensureWindowsOpencodeShim() {
  console.log('Windows detected: Ensuring OpenCode CLI shim exists...');
  
  const { platform, arch } = detectPlatformAndArch();
  if (platform !== 'windows') {
    console.log('Not Windows, skipping postinstall');
    return;
  }

  try {
    // Try to find Windows binary package
    const packageName = `opencode-${platform}-${arch}`;
    
    // Look for binary package in node_modules
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    const packageJsonPath = path.join(nodeModulesPath, packageName, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log(`OpenCode Windows binary package ${packageName} not found, skipping shim creation`);
      return;
    }

    const packageDir = path.dirname(packageJsonPath);
    const binaryPath = path.join(packageDir, 'bin', 'opencode.exe');
    
    if (!fs.existsSync(binaryPath)) {
      console.log(`OpenCode binary not found at ${binaryPath}, skipping shim creation`);
      return;
    }

    // Create .bin directory if it doesn't exist
    const binDir = path.join(nodeModulesPath, '.bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Create Windows batch file shim
    const shimPath = path.join(binDir, 'opencode.cmd');
    const shimContent = `@echo off
"${binaryPath}" %*
`;
    
    fs.writeFileSync(shimPath, shimContent);
    console.log(`Created OpenCode CLI shim: ${shimPath} -> ${binaryPath}`);

    // Also create a PowerShell shim for completeness
    const psShimPath = path.join(binDir, 'opencode.ps1');
    const psShimContent = `param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

& "${binaryPath}" $Arguments
`;
    
    fs.writeFileSync(psShimPath, psShimContent);
    console.log(`Created OpenCode PowerShell shim: ${psShimPath}`);

  } catch (error) {
    console.error('Failed to create OpenCode CLI shim:', error.message);
    // Don't exit with error, just log it - package should still be usable
  }
}

// Only run on Windows with Bun (since npm handles this correctly)
if (os.platform() === 'win32' && process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('bun')) {
  ensureWindowsOpencodeShim();
} else if (os.platform() === 'win32') {
  console.log('Windows detected but not Bun, skipping postinstall (npm handles this correctly)');
} else {
  console.log('Not Windows, skipping postinstall');
}