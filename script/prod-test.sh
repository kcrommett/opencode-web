#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
bun install

echo "Building application..."
bun run build

echo "Starting in production mode..."
bun run start
