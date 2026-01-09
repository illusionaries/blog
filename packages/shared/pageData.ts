export interface PageData {
  time: string
  title: string
  textTitle: string
  excerpt?: string
  textExcerpt?: string
  category?: string
  contentUrl: string
  sourceUrl: string
  meta?: { [key: string]: string }
  data: { [key: string]: unknown }
  tags?: string[]
  lang?: string
}
