#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

const electron = require('electron')
const appPath = path.join(__dirname, '..', 'out', 'main', 'index.js')

const child = spawn(String(electron), [appPath], {
  stdio: 'inherit',
  windowsHide: false
})

child.on('close', (code) => {
  process.exit(code ?? 0)
})

process.on('SIGTERM', () => child.kill('SIGTERM'))
process.on('SIGINT', () => child.kill('SIGINT'))
