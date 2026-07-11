import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'vite'

export const dev = async () => {
  const distDir = path.dirname(fileURLToPath(import.meta.resolve('scantpress')))
  const packageDir = path.resolve(distDir, '../')
  const viteConfigFile = path.resolve(packageDir, 'vite.config.ts')
  const server = await createServer({
    configFile: viteConfigFile,
  })
  await server.listen()
  console.log(`Development server is running at: ${server.resolvedUrls?.local[0]}`)
}
