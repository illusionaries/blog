import { defineConfig } from '@scantpress/shared'

export default defineConfig({
  markdown: {
    container: {
      warningLabel: '警告',
      errorLabel: '错误',
      infoLabel: '信息',
      expanderLabel: '更多',
    },
  },
  categories: {
    blog: '博客',
    notes: '笔记',
    life: '生活',
    articles: '文章',
  },
  name: '彩笔的部落阁',
  theme: 'new-year',
  pureStatic: true,
  git: {
    repo: 'illusionaries/blog',
  },
  defaultLang: 'zh-CN',
  social: {
    github: 'illusionaries',
    email: 'illusionaries@icloud.com',
  },
})
