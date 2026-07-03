import type { PageData } from 'scantpress'
import { ref } from 'vue'
import context from 'virtual:context'

export function isIndexPage(slugs: string[]): boolean {
  return slugs.length === 1 && slugs[0]! in context.config.categories
}

export function dateString(rawDate: string | undefined): string {
  if (rawDate == undefined) return ''
  const date = new Date(rawDate)
  const year = date.getFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  return `${year} 年 ${month} 月 ${day} 日`
}

export function dateStringLong(rawDate: string | undefined): string {
  if (rawDate == undefined) return ''
  const date = new Date(rawDate)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  return `${year} 年 ${month} 月 ${day} 日 ${hours
    .toString()
    .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function groupByYearMonth<T extends { time: string }>(items: T[]) {
  return items.reduce(
    (
      acc: {
        year: number
        month: number
        items: T[]
      }[],
      item,
    ) => {
      const date = new Date(item.time)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      if (
        acc.length === 0 ||
        acc[acc.length - 1]!.year !== year ||
        acc[acc.length - 1]!.month !== month
      ) {
        acc.push({
          year,
          month,
          items: [item],
        })
        return acc
      }
      acc[acc.length - 1]!.items.push(item)
      return acc
    },
    [],
  )
}

export function throttleAndDebounce(
  fn: (...args: unknown[]) => void,
  delay: number,
): (...args: unknown[]) => void {
  let timeoutId: NodeJS.Timeout
  let called = false

  return (...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    if (!called) {
      fn(...args)
      called = true
      setTimeout(() => (called = false), delay)
    } else timeoutId = setTimeout(fn, delay)
  }
}

export async function waitForAppearance(
  selector: string,
  ms: number = 100,
  timeoutMs: number = 1000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const selectorResult = document.querySelector(selector)
      if (selectorResult) {
        clearInterval(interval)
        resolve(selectorResult)
      }
    }, ms)
    setTimeout(() => {
      clearInterval(interval)
      resolve(null)
    }, timeoutMs)
  })
}

export function pageEntryCompare(a: PageData, b: PageData): number {
  const timeDiff = Date.parse(b.time) - Date.parse(a.time)
  if (timeDiff !== 0) return timeDiff
  return b.title.localeCompare(a.title, ['en', 'zh'], { numeric: true })
}

export function usePromiseResult<T>(promise: Promise<T>, initialValue: T) {
  const value = ref<T>(initialValue)
  promise.then((v) => {
    value.value = v
  })
  return value
}
