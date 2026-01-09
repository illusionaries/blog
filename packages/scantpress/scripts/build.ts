import path from 'path'
import { build } from 'vite'
import { prerender } from './prerender'
import { sitemap } from './sitemap'
import { loadConfig, SiteConfiguration } from '@scantpress/shared'
import { minify } from './minify'
import { exec } from 'child_process'

const loadResult = await loadConfig()

const PROJECT_ROOT = path.dirname(loadResult.sources[0])

const config = {
  ...loadResult.config,
  root: PROJECT_ROOT,
} as SiteConfiguration & { root: string }

const client = build({
  build: {
    outDir: path.resolve(PROJECT_ROOT, 'dist/static'),
    emptyOutDir: true,
    ssrManifest: true,
    reportCompressedSize: false,
  },
})

const server = build({
  build: {
    outDir: path.resolve(PROJECT_ROOT, 'dist/server'),
    emptyOutDir: true,
    ssr: 'entry-server.ts',
    reportCompressedSize: false,
  },
})

await Promise.all([client, server])
console.log('Build completed.')

const prerenderPromise = prerender(config)
const sitemapPromise = sitemap(config)

await Promise.all([prerenderPromise, sitemapPromise])
await minify(path.resolve(PROJECT_ROOT, 'dist/static'))
console.log('Post-build steps completed.')

await new Promise((resolve, reject) => {
  exec(
    `bunx pagefind --site ${path.resolve(PROJECT_ROOT, 'dist/static')}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error during Pagefind indexing: ${error.message}`)
        reject(error)
      }
      if (stderr) {
        console.error(`Pagefind stderr: ${stderr}`)
        reject(new Error(stderr))
      }
      console.log(stdout)
    },
  ).on('exit', resolve)
})
console.log('Pagefind indexing completed.')
