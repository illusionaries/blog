import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { minify } from 'html-minifier'
import * as cheerio from 'cheerio'
import chalk from 'chalk'

console.log(chalk.bgYellow.greenBright('Minify:'))

const DIST_DIR = path.join('dist', 'static')
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

function processHtmlFile(filePath: string) {
  let htmlContent = fs.readFileSync(filePath, 'utf8')

  const $ = cheerio.load(htmlContent)
  const elements = $(
    ['script', 'link[rel=stylesheet]', 'link[rel=preload]', 'link[rel=modulepreload]'].join(),
  ).get()

  for (const el of elements) {
    const url = $(el).attr('href') || $(el).attr('src')
    if (!url || !url.startsWith('/')) continue

    $(el).attr('integrity', generateSriHash(`${DIST_DIR}${url}`))
    $(el).attr('crossorigin', 'anonymous')
  }

  htmlContent = $.html()

  const minifiedHtml = minify(htmlContent, {
    caseSensitive: true,
    minifyCSS: true,
    minifyJS: true,
    removeComments: false,
  })

  fs.writeFileSync(filePath, minifiedHtml, 'utf8')
  console.log(chalk.green('minified:'), filePath)
}

function processDirectory(directory: string) {
  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file)
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath)
    } else if (file.endsWith('.html')) {
      processHtmlFile(fullPath)
    }
  })
}

processDirectory(DIST_DIR)
