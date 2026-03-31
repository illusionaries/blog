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
    memos: '备忘录',
    life: '生活',
    articles: '文章',
  },
  name: '彩笔的部落阁',
  theme: 'normal',
  pureStatic: true,
  git: {
    repo: 'illusionaries/blog',
  },
  defaultLang: 'zh-CN',
  social: {
    github: 'illusionaries',
    email: 'illusionaries@icloud.com',
  },
  additionalHeads: [
    '<script defer src="https://cloud.umami.is/script.js" data-website-id="0b23eef0-bb7f-44a8-b4df-4121bd073e79"></script>',
  ],
})
