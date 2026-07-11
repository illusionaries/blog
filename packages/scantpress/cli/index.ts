#!/usr/bin/env node

import { program } from 'commander'
import { build } from './build'
import { createServer } from 'vite'
import { dev } from './dev'

program.name('ScantPress').description('CLI tool for ScantPress').version('0.0.1')

program
  .command('build')
  .description('Build the project')
  .action(() => {
    build()
  })

program.command('dev').description('Start the development server').action(dev)

program.parse(process.argv)
