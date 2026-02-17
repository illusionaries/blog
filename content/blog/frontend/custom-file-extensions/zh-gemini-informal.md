---
title: '文件扩展名、VSCode、Vue、Vite 和 SSG：手搓一个照片库'
time: 2026-02-16
tags:
  - Frontend
  - Vite
  - VSCode
lang: zh-CN
hidden: true
---

在这篇文章里，我们来聊聊怎么用 Vite 和 Vue 搭建一个照片库，顺便看看怎么让 VSCode 认出我们自定义的文件扩展名。最后，咱们再把这个 SPA 项目变成一个静态生成的站点（SSG）。

---

:::info 图一乐
本文由[英文版本](../en/)翻译而来，翻译所用模型为 Gemini 3 Pro。英文文本来自 [Commit 64750e1](https://github.com/illusionaries/blog/commit/64750e18cad61853da73455956bcf982dabcc67b)，与现行版本可能存在细微差别。

本文有两个由 Gemini 3 Pro 师傅翻译的版本：

- [G 体中文（书面）](../zh-gemini-formal/)
- G 体中文（口语）（★ 您在此处！）

:::

[简体中文](../zh/) | [English](../en/)

## 简介

对新手来说，写一个 Vite 插件听起来可能有点吓人。不过，Vite 的插件 API 设计得很棒，加上 NPM 社区里那一堆好用的包，其实上手真没那么难。

这篇文章主要就是探索一下前端开发里的自定义文件扩展名，还有怎么跟 VSCode 配合起来。顺便，我们也会稍微提一嘴 SSR/SSG。深究自定义语法就不在今天的讨论范围内了，我们主要关注怎么利用现有的工具和一些简单的插件，用更接地气、更实用的方法搞定需求。

在开始之前，你应该对 Vite 和 Vue 稍微有点了解。如果你看到 `inject`、`provide`、`SSRContext` 和 `glob import` 这些词一脸懵逼，我也不会展开细讲。要是真晕了，建议去翻翻 [Vite](https://vite.dev/) 和 [Vue](https://vuejs.org/) 的官方文档。或者直接问问 AI 老师也没问题！

## 项目搭起来

### 脚手架

首先，咱们用 Vite 和 Vue 起个新项目。接下来的操作我会用 Bun.js (`bun`, `bunx`) 做包管理器，不过你也得装个 Node.js 来跑运行时。

```sh
bun create vite@latest gallery
│
◇  Select a framework:
│  Vue
│
◇  Select a variant:
│  TypeScript
```

用 VSCode 打开项目文件夹，记得把 [Vue (Official)](vscode:extension/Vue.volar) 插件开了。**小贴士**：如果 VSCode 跟你抱怨找不到 `*.vue` 文件的类型定义，重启一下窗口，让 Volar 接管 TypeScript 智能感知通过就好了。

这次我们要用到 **UnoCSS** 和 **YAML**，所以这两个插件也顺手装一下：

- [**UnoCSS** by Anthony Fu](vscode:extension/antfu.unocss)
- [**YAML** by Red Hat](vscode:extension/redhat.vscode-yaml)

### 配置 UnoCSS 和 Vue Router

这里就不长篇大论地讲怎么装 UnoCSS 和 Vue Router 了，直接把项目里用的配置贴出来。如果你想知道它们具体咋配，去看看官方文档：

- [UnoCSS Vite 插件](https://unocss.dev/integrations/vite)
- [Vue Router 入门](https://router.vuejs.org/guide/)

其实 UnoCSS 不是非用不可，你想用别的 CSS 框架或者手写 CSS 都行。不过下面的栗子可能会用到点 UnoCSS 的写法。

:::expander uno.config.ts

```ts
import { defineConfig, presetAttributify, presetWind4 } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4({
      dark: 'media',
      preflights: {
        reset: false,
      },
    }),
    presetAttributify(),
  ],
})
```

:::

:::: info 如果 VSCode 报错说 "Cannot find module 'virtual:uno.css' or its corresponding type declarations."（找不到 'virtual:uno.css' 模块或类型声明。）

:::expander vite-env.d.ts

```ts
/// <reference types="vite/client" /> // [!code ++]
```

:::

::::

:::expander main.ts

```ts
// import ...

const routes = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/gallery/:id',
    component: () => import('@/views/GalleryView.vue'),
  },
] satisfies RouteRecordRaw[]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 进 GalleryView 的时候把滚动条重置到顶部
  scrollBehavior(to, _, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path.startsWith('/gallery/')) {
      return { top: 0 }
    }
  },
})

createApp(App).use(router).mount('#app')
```

:::

## 数据模型设计

得给咱们的画廊设计个像样的数据模型。

首先，咱们需要两个类型：`Gallery`（相册）和 `Image`（图片）。`Gallery` 里得有一堆图片，还得有点元数据，比如 `location`（地点）和 `date`（日期）；`Image` 得有图片 URL，再加上 `title`（标题）和 `description`（描述）这些信息。

另外，`GalleryView` 咱们打算做成三栏瀑布流布局，所以在图片加载出来之前最好就知道它的尺寸，否则会出现许多布局偏移。所以，`Image` 里还得加上 `width`（宽）和 `height`（高）。这俩属性标成可选的就行，回头让插件帮我们自动填上。

最后定下来是这样：
:::expander src/model/index.ts

```ts
export interface Image {
  imageSrc: string
  title: string
  description?: string
  additionalInfo?: string
  width?: number
  height?: number
}

export interface Gallery {
  location: string
  date: string
  images: Image[]
}
```

:::

为了省去像 `import Cat from './assets/cat.jpeg'` 这种麻烦事，我们直接把图片扔到 `/public` 下面，然后在 `Image.imageSrc` 里直接写 `/cat.jpeg` 就行。

当然，其实完全可以写个插件来帮我们处理导入，稍后你就知道了。

## 自定义扩展名 `*.gallery`

现在得把这些相册数据存起来。我们想把这些像数据库一样的文件都放在项目根目录下的 `data` 文件夹里。主要问题是，用什么格式来写呢？

### TypeScript?

TypeScript 写类型安全的代码很爽，定义数据结构也行，但用来存数据其实不太顺手。比如我们要用 TypeScript 描述一个相册：

```ts
export default {
  location: 'Tokyo',
  date: '2026-02-16',
  images: [
    {
      imageSrc: '/tokyo/tokyo-tower.jpg',
      title: 'Tokyo Tower',
      description: 'A famous landmark in Tokyo.',
    },
  ],
}
```

如果不需要补全，这样也凑合。但如果要补全，你就得先从 `@/model` 导个 `type { Gallery }` 进来，然后在对象屁股后面加上 `satisfies Gallery`，补全才会有反应。太麻烦了。

### JSON?

Vite 虽然自带 [JSON 导入](https://vite.dev/guide/features#json) 支持，但 JSON 写起来真难受（尤其是那一堆双引号！），而且要有补全还得配 JSON schema。既然反正都要配 JSON schema，不如选个写起来更舒服的格式？

### XML?

别闹，都 2026 年了！

### YAML!

就决定是你了，YAML！看着清爽，写着顺手。而且 Red Hat 的 YAML 插件还能配合 JSON schema 做校验和补全。

用 YAML 写出来的相册长这样：

```yaml
location: Tokyo
date: 2026-02-16
images:
  - imageSrc: /tokyo/tokyo-tower.jpg
    title: Tokyo Tower
    description: A famous landmark in Tokyo.
```

不过直接用 `*.yaml` 看着太普通了，而且我老是记不住到底该用 `*.yaml` 还是 `*.yml`，代码里还得处理这两种情况。干脆搞个自定义扩展名吧！就叫 `*.gallery` 好了。

:::expander data/tokyo.gallery

```yaml
location: Tokyo
date: 2026-02-16
images:
  - imageSrc: /tokyo/tokyo-tower.jpg
    title: Tokyo Tower
    description: A famous landmark in Tokyo.
```

:::

## 这里需要调教一下 VSCode

为了让 VSCode 认得咱们~~瞎编~~的新格式，得改点设置。第一步，把 `*.gallery` 关联到 YAML，这样 YAML 插件才会去处理这种文件。第二步，配置 YAML 插件，把 JSON schema 绑定到 `*.gallery` 文件上，这样补全和校验就都有了。

懒人福利，直接把这段 JSON 设置拷走：

:::expander .vscode/settings.json

```json
{
  "files.associations": {
    "*.gallery": "yaml"
  },
  "yaml.schemas": {
    "./gallery.schema.json": "**/*.gallery"
  }
}
```

:::

把上面这段扔进 `.vscode/settings.json` 里，两步工作瞬间搞定。你喜欢用 VSCode 的设置界面点点点也行，但记得选“工作区（Workspace）”，不然把你全局设置搞乱了别怪我。

接下来生成那个 JSON schema 文件 `gallery.schema.json`。好在早就有人造好轮子了，装个包就行。

```sh
bun install -D ts-json-schema-generator
ts-json-schema-generator --path src/model/index.ts --type Gallery --out gallery.schema.json
```

:::expander 生成的 gallery.schema.json

```json
{
  "$ref": "#/definitions/Gallery",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "Gallery": {
      "additionalProperties": false,
      "properties": {
        "date": {
          "type": "string"
        },
        "images": {
          "items": {
            "$ref": "#/definitions/Image"
          },
          "type": "array"
        },
        "location": {
          "type": "string"
        }
      },
      "required": ["location", "date", "images"],
      "type": "object"
    },
    "Image": {
      "additionalProperties": false,
      "properties": {
        "additionalInfo": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "height": {
          "type": "number"
        },
        "imageSrc": {
          "type": "string"
        },
        "title": {
          "type": "string"
        },
        "width": {
          "type": "number"
        }
      },
      "required": ["imageSrc", "title"],
      "type": "object"
    }
  }
}
```

:::

现在去 `data/` 下面新建个 `*.gallery` 文件试试，补全应该已经生效了。

## 让前端项目也能读懂 `*.gallery`

编辑器搞定了，还得让我们的前端项目也能处理这个新扩展名。

### 手写一个 Vite 插件

默认情况下，Vite 肯定不认识 `*.yaml`，更别提 `*.gallery` 了。我们需要写个插件，把 `*.gallery` 文件转成 JavaScript。

先装个 `yaml` 包。

```sh
bun install -D yaml
```

然后把插件架子搭起来：

:::expander plugin/gallery-loader.ts

```ts
import type { Plugin } from 'vite'
import { parse } from 'yaml'
import type { Gallery } from '@/model'

export default function GalleryLoaderPlugin(): Plugin {
  return {
    name: 'vite-plugin-gallery-loader',
    async transform(code, id) {
      if (id.endsWith('.gallery')) {
        const gallery = parse(code) as Gallery
        return `export default ${JSON.stringify(gallery)}`
      }
    },
  }
}
```

:::

别忘了把 `plugin/*.ts` 加入到 `tsconfig.node.json` 的 include 里。

这段代码逻辑其实挺简单的：如果文件路径是以 `.gallery` 结尾的，那就用 `yaml` 解析它，然后拼一段 JavaScript 代码，把这个对象 `export default` 出去；如果不是，就不管它。我们用 `JSON.stringify()` 把对象转成字符串，因为 JSON 本身就是合法的 JS 对象字面量。要是不转，输出个 `export default [object Object]`，浏览器就该懵圈了。

其实我们还能加点料！

要记得，在 Vite 项目里，代码是分别在两个环境里跑的：

- 构建和转换代码的时候（比如插件），是在本地 Node.js 环境跑的，能读写本地文件。
- 前端业务代码（比如 `*.vue` 和转换后的 `*.gallery`），是在 Node.js 转换成 JS 后，发给浏览器跑的（这时候就别想读文件了）。

也就是说，我们**没法**在浏览器下载图片之前知道图片尺寸，但我们**可以**在构建阶段（Node.js 端）就把图片尺寸算好，然后塞到发送给浏览器的 JS 代码里。

比如，用个 `image-dimensions` 包，我们可以这样搞：

```ts
for (const image of gallery.images) {
  const imagePath = `./public${image.imageSrc}`
  const imageStream = ReadableStream.from(createReadStream(imagePath))
  const dimensions = await imageDimensionsFromStream(imageStream)
  image.width = dimensions?.width
  image.height = dimensions?.height
}
```

把这段插在 yaml 解析之后、JSON 序列化之前。

而且返回的代码也不一定非得是简单的 `export default`。前面提过，我们可以把相对路径转换成 Vite 最终构建出的带哈希的文件路径。做法大概是生成这样的代码：

```ts
import some_file_name_and_hash_x0naF82n from './relative/path.jpeg'

export default {
  location: 'foo',
  date: 'bar',
  images: [
    {
      imageSrc: some_file_name_and_hash_x0naF82n,
      title: 'foobar',
      description: 'foo? bar!',
    },
  ],
}
```

这就留给你当课后作业了，有兴趣可以自己试着实现一下！

### 批量导入相册

现在 Vite 认识 `*.gallery` 了，咱们把它导入代码里。为了省事，我们用 [Glob 导入](https://vite.dev/guide/features#glob-import) 一次性把所有的都导进来。

这里我们直接用 eager 模式（非懒加载）。

```ts
// main.ts
const galleries = import.meta.glob<{ default: Gallery }>('./*.gallery', {
  eager: true,
  base: '../data/',
})
```

拿到的 `galleries` 对象大概长这样：

```ts
const galleries: Record<string, { default: Gallery }> = {
  './tokyo.gallery': {
    default: {
      location: 'Tokyo',
      date: '2026-02-16',
      images: [
        {
          imageSrc: '/tokyo/tokyo-tower.jpg',
          title: 'Tokyo Tower',
          description: 'A famous landmark in Tokyo.',
          width: 1920,
          height: 1080,
        },
        // ...
      ],
    },
  },
  './shanghai.gallery': {
    default: {
      location: 'Shanghai',
      date: '2026-01-01',
      // ...
    },
  },
  // ...
}
```

每个 `default` 里面就是我们从 `*.gallery` 解析出来的数据。

接着把 `galleries` 对象注入到 App 实例里，想用的时候随时取。main.ts 最终大概是这样：

```ts
// import ...
const routes = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/gallery/:id',
    component: () => import('@/views/GalleryView.vue'),
  },
] satisfies RouteRecordRaw[]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 进 GalleryView 时重置滚动条
  scrollBehavior(to, _, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path.startsWith('/gallery/')) {
      return { top: 0 }
    }
  },
})

const galleries = import.meta.glob<{ default: Gallery }>('./*.gallery', {
  eager: true,
  base: '../data/',
})

createApp(App).use(router).provide(GalleryInjectionKey, galleries).mount('#app')
```

`GalleryInjectionKey` 定义在 `src/keys.ts` 里：

```ts
export const GalleryInjectionKey = Symbol('galleries') as InjectionKey<
  Record<string, { default: Gallery }>
>
```

这样注入的时候就有类型提示了。

### 搞定视图层

这块内容跟主题关系不大，稍微带过一下。

在 `src/views/HomeView.vue` 里，遍历注入进来的相册列表：

```vue
<script setup lang="ts">
// import ...

const galleries = Object.entries(inject(GalleryInjectionKey)!).map(([k, v]) => {
  // 正则把 key 里的 "./foo.gallery" 变成 "foo"，
  // 用来拼路由，比如 "/gallery/foo"。
  return { ...v.default, id: k.match(/^\.\/(.*)\.gallery$/)![1]! }
})
</script>
<template>
  <main mx-auto>
    <RouterLink
      block
      w-screen
      h-screen
      cursor-pointer
      v-for="gallery in galleries"
      :key="gallery.id"
      :to="`/gallery/${gallery.id}`">
      <GalleryCard :gallery="gallery" />
    </RouterLink>
  </main>
</template>
```

在 `src/views/GalleryView.vue` 里，拿到 `id` 参数，把对应的内容渲染出来。

```vue
<script setup lang="ts">
// import ...

const galleries = inject(GalleryInjectionKey)!
const route = useRoute()
const galleryId = route.params.id as string
const galleryModuleId = `./${galleryId}.gallery`
const gallery = galleries[galleryModuleId]?.default
</script>
<template>
  <main max-w-1000px mx-auto py-12 px-2 min-h-screen flex="~ col">
    <div v-if="gallery">
      <h1 m-0>
        {{ gallery.location }}
      </h1>
      <p mt-1>
        {{ gallery.date }}
      </p>
      <div columns-1 sm:columns-2 lg:columns-3 gap-2>
        <ImageCard
          mt-2
          first:mt-0
          v-for="(image, index) in gallery.images"
          :key="image.imageSrc"
          :image="image" />
      </div>
    </div>
    <div v-else>
      <h1 m-0>404 Not Found</h1>
      <p mt-1>
        <RouterLink
          path="/"
          underline="~ offset-2 gray-200 hover:current"
          color-gray-500
          hover:color-inherit
          transition-colors
          duration-300
          cursor-pointer
          >返回首页</RouterLink
        >
      </p>
    </div>
    <div flex-1></div>
    <Footer mt-12 />
  </main>
</template>
```

`GalleryCard` 和 `ImageCard` 你们就自己随意发挥了。

## 静态生成 (SSG) 走起

:::info 来源
本节部分代码参考了 https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js 和 https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/src/entry-server.js。

强烈建议去看看 [Vite 官方文档](https://vite.dev/guide/ssr)，讲得肯定比我清楚。
:::

这个项目简直是演示 SSG 的完美样板：

1. 显示照片其实根本不需要 JS。
2. 只要把每个路由都预渲染成 HTML，那一堆跟导航有关的 JS 都可以丢掉了。
3. 虽然加上 JS 水合（Hydration）体验会好点，但没有也没啥大不了的。

要搞 SSG，得先让项目支持 SSR。

### 迁移到 SSR

1. 把 `src/main.ts` 改名叫 `src/app.ts`，然后新建 `entry-client.ts` 和 `entry-server.ts`。
2. 去 `index.html`，把引用的 `src/main.ts` 换成 `src/entry-client.ts`。
3. 还是 `index.html`，在 `div#app` 里加个坑位 `<!--app-html-->`，在 `head` 里加个 `<!--preload-links-->`。
4. 改造 `src/app.ts`，把 `createRouter()` 和 `createApp()` 封装成一个工厂函数。大概长这样：
   :::expander src/app.ts

   ```ts
   import { createApp as createVueApp, createSSRApp } from 'vue'
   // import ...

   const galleries = import.meta.glob<{ default: Gallery }>('./*.gallery', {
     eager: true,
     base: '../data/',
   })

   const routes = [
     {
       path: '/',
       component: () => import('@/views/HomeView.vue'),
     },
     {
       path: '/gallery/:id',
       component: () => import('@/views/GalleryView.vue'),
     },
   ] satisfies RouteRecordRaw[]

   export const createApp = () => {
     const router = createRouter({
       // SSR 环境用内存历史模式，客户端用 Web History
       history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
       routes,
       scrollBehavior(to, _, savedPosition) {
         if (savedPosition) return savedPosition
         if (to.path.startsWith('/gallery/')) {
           return { top: 0 }
         }
       },
     })
     const app = (import.meta.env.DEV ? createVueApp(App) : createSSRApp(App))
       .use(router)
       .provide(GalleryInjectionKey, galleries)
     return { app, router }
   }
   ```

   :::

5. `src/entry-client.ts` 就很简单，创建应用然后挂载：

   ```ts
   import { createApp } from './app'

   createApp().app.mount('#app')
   ```

6. `src/entry-server.ts` 要负责把 `App` 渲染成字符串：

   ```ts
   import { createApp } from './app'
   import { renderToString, type SSRContext } from 'vue/server-renderer'

   export async function render(path: string) {
     const { app, router } = createApp()
     router.push(path)
     await router.isReady()
     const ctx: SSRContext = {}
     const html = await renderToString(app, ctx)
     return { html, ctx }
   }
   ```

7. 检查你的代码，`script setup` 里别出现浏览器才有的 API（比如 window、document），或者把它们包在 `onMounted` 里。

8. 改一下 `package.json`：

   ```json
   {
     "scripts": {
       "dev": "vite",
       "build:client": "vite build --ssrManifest --outDir dist/client",
       "build:server": "vite build --ssr src/entry-server.ts --outDir dist/server",
       "schema": "ts-json-schema-generator --path src/model/index.ts --type Gallery --out gallery.schema.json",
       "build:all": "bun schema && bun build:client && bun build:server && bun prerender"
     }
   }
   ```

### 批量生成页面

先要把所有需要预渲染的路由找出来。这里我们用 `fast-glob`。

```ts
import fg from 'fast-glob'

const routes = await fg('data/*.gallery', { objectMode: true }).then((x) =>
  x.map(({ name }) => {
    const id = name.replace(/\.gallery$/, '')
    return `/gallery/${id}`
  }),
)

// 别忘了首页
routes.push('/')
```

然后就是渲染并保存 HTML 文件了。

```ts
// 这里的 import 路径要指向构建出来的服务端入口
const render = (await import('../dist/server/entry-server.js' as string).then(
  (mod) => mod.render,
)) as (path: string) => Promise<{ html: string; ctx: Record<string, any> }>
// 读取客户端构建出的 index.html 模板
const template = await fs.readFile('dist/client/index.html', 'utf-8')
const manifest = JSON.parse(
  await fs.readFile('dist/client/.vite/ssr-manifest.json', 'utf-8'),
) as Record<string, string[]>

for (const route of routes) {
  const { html, ctx } = await render(route)
  const preloadLinks = renderPreloadLinks(ctx.modules, manifest)
  const finalHtml = template
    .replace(`<!--preload-links-->`, preloadLinks)
    .replace(`<!--app-html-->`, html)
  // 首页生成 index.html，其他页面生成对应名字的 .html
  const filePath = 'dist/client' + (route === '/' ? '/index.html' : `${route}.html`)
  const fileDir = dirname(filePath)
  await fs.mkdir(fileDir, { recursive: true })
  await fs.writeFile(filePath, finalHtml, 'utf-8')
}

// 下面这两个函数用来生成预加载链接，代码有点长就不全贴了，
// 基本逻辑就是根据 manifest 查找当前页面依赖的资源，生成 <link rel="preload">
function renderPreloadLinks(modules: Set<string>, manifest: { [key: string]: string[] }) {
  // ... (省略具体实现，跟官方示例差不多)
  let links = ''
  const seen = new Set()
  modules.forEach((id) => {
    const files = manifest[id]
    if (files) {
      files.forEach((file) => {
        if (!seen.has(file)) {
          seen.add(file)
          const filename = basename(file)
          if (manifest[filename]) {
            for (const depFile of manifest[filename]) {
              links += renderPreloadLink(depFile)
              seen.add(depFile)
            }
          }
          links += renderPreloadLink(file)
        }
      })
    }
  })
  return links
}

function renderPreloadLink(file: string) {
  // ... (根据文件后缀返回不同的 link 标签)
  if (file.endsWith('.js')) {
    return `<link rel="modulepreload" crossorigin href="${file}">`
  } else if (file.endsWith('.css')) {
    return `<link rel="stylesheet" href="${file}">`
  } else if (file.endsWith('.woff')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  } else if (file.endsWith('.woff2')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  } else if (file.endsWith('.gif')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/gif">`
  } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`
  } else if (file.endsWith('.png')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/png">`
  } else {
    return ''
  }
}
```

搞定！现在你可以直接把 `dist/client` 文件夹扔到任何静态文件服务器上，那个讨厌 JavaScript 的用户也能正常看你的照片了。

### SSG 小贴士

有时候你可能想在服务端改改页面标题（`<title>`）。但在服务端跑的时候是没有 DOM 的，`document.title` 用不了。

有个小技巧（改标题、改语言都适用）：

1. 在 `script setup` 里，通过 `useSSRContext()` 拿到 SSR 上下文。
2. 往这个上下文里塞点私货。
3. 在 `index.html` 里留个坑，比如 `<title><!--title--></title>`。
4. 在预渲染脚本里，从 `ctx` 里取出值，把 HTML 里的坑填上。
5. 记得包在 `if (import.meta.env.SSR)` 里，不然 tree-shaking 可能会失效。

而在客户端，还是得老老实实地在 `onMounted` 或者用 `useTitle` 之类的钩子去改 DOM。

Vue 这边大概是这样写：

```vue
<script setup lang="ts">
useTitle('Galleries') // 客户端改标题
if (import.meta.env.SSR) {
  const ctx = useSSRContext()
  if (ctx) {
    ctx.title = 'Galleries' // 服务端传数据
  }
}
</script>
```

## 总结

这篇文章咱们用 Vite 和 Vue 搓了一个照片库，核心玩法就是那个自定义的 `*.gallery` 文件扩展名。我们调教了 VSCode 让它乖乖听话，还写了个 Vite 插件把 YAML 转成了 JS，最后更是把整个站做成了静态生成的。

当然这只是个简单的 Demo，但这里的思路可以用在很多更复杂的地方。比如你可以写个插件把 Markdown 转成 Vue 组件，再套个 Vue 插件处理剩下的事——其实 [VitePress](https://vitepress.dev/) 就是这么干的，你现在看到的这个博客也是用类似的野路子生成的！要是你觉得 YAML 不顺手，改改插件支持 TOML 甚至你自己发明的格式也完全没问题。

完整代码都放在 https://github.com/illusionaries/gallery 了，在线演示戳这里：https://gallary.illusion.blog。

感谢阅读，下次见！
