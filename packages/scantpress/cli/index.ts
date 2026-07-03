import { program } from 'commander'
import { build } from './build'

program.name('ScantPress').description('CLI tool for ScantPress').version('0.0.1')

program
  .command('build')
  .description('Build the project')
  .action(() => {
    build()
  })

program.parse(process.argv)
