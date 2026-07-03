import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { minify as minifyHtml } from 'html-minifier-terser'
import * as cheerio from 'cheerio'
import chalk from 'chalk'

export async function minify(staticDistDir: string) {
  console.log(chalk.bgYellow.greenBright('Minify:'))

  const hashCache: Record<string, string> = {}

  function generateSriHash(filePath: string): string {
    if (hashCache[filePath]) {
      return hashCache[filePath]
    }
    const fileBuffer = fs.readFileSync(filePath)
    const hash = createHash('sha384').update(fileBuffer).digest('base64')
    const sriHash = `sha384-${hash}`
    hashCache[filePath] = sriHash
    return sriHash
  }

  async function processHtmlFile(filePath: string) {
    let htmlContent = fs.readFileSync(filePath, 'utf8')

    const $ = cheerio.load(htmlContent)
    const elements = $(
      ['script', 'link[rel=stylesheet]', 'link[rel=preload]', 'link[rel=modulepreload]'].join(),
    ).get()

    for (const el of elements) {
      const url = $(el).attr('href') || $(el).attr('src')
      if (!url || !url.startsWith('/')) continue

      $(el).attr('integrity', generateSriHash(path.join(staticDistDir, url)))
      $(el).attr('crossorigin', 'anonymous')
    }

    htmlContent = $.html()

    const minifiedHtml = await minifyHtml(htmlContent, {
      caseSensitive: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: false,
    })

    fs.writeFileSync(filePath, minifiedHtml, 'utf8')
    console.log(chalk.green('minified:'), filePath)
  }

  async function processDirectory(directory: string) {
    const files = fs.readdirSync(directory)
    for (const file of files) {
      const fullPath = path.join(directory, file)
      if (fs.statSync(fullPath).isDirectory()) {
        await processDirectory(fullPath)
      } else if (file.endsWith('.html')) {
        await processHtmlFile(fullPath)
      }
    }
  }

  await processDirectory(staticDistDir)
}
