#!/usr/bin/env node

// Prepublish script to ensure package is built before publishing
const { spawn } = require('child_process');
const path = require('path');

console.log('Running prepublish checks...');

// Check if dist directory exists and has files
const fs = require('fs');
const distPath = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  console.error('ERROR: dist directory not found. Please build the package first.');
  process.exit(1);
}

const distFiles = fs.readdirSync(distPath);
if (distFiles.length === 0) {
  console.error('ERROR: dist directory is empty. Please build the package first.');
  process.exit(1);
}

// Check if server.ts exists in package root
const serverPath = path.join(__dirname, '..', 'server.ts');
if (!fs.existsSync(serverPath)) {
  console.error('ERROR: server.ts not found. Please build the package first.');
  process.exit(1);
}

// Check if dist/server exists
const distServerPath = path.join(distPath, 'server');
if (!fs.existsSync(distServerPath)) {
  console.error('ERROR: dist/server directory not found. Please build the package first.');
  process.exit(1);
}

console.log('Prepublish checks passed');