---
title: '文件扩展名、VSCode、Vue、Vite 和 SSG：构建一个照片库'
time: 2026-02-16
tags:
  - Frontend
  - Vite
  - VSCode
lang: zh-CN
hidden: true
---

在本文中，我们将探索如何使用 Vite 和 Vue 创建一个照片库，以及如何配置 VSCode 以识别自定义文件扩展名。最后，我们将把项目从 SPA 转换为静态生成的站点。

---

:::info 图一乐
本文由[英文版本](../en/)翻译而来，翻译所用模型为 Gemini 3 Pro。英文文本来自 [Commit 64750e1](https://github.com/illusionaries/blog/commit/64750e18cad61853da73455956bcf982dabcc67b)，与现行版本可能存在细微差别。

本文有两个由 Gemini 3 Pro 师傅翻译的版本：

- G 体中文（书面）（★ 您在此处！）
- [G 体中文（口语）](../zh-gemini-informal/)

:::

[简体中文](../zh/) | [English](../en/)

## 简介

对于初学者来说，编写一个 Vite 插件似乎是一项艰巨的任务。然而，凭借 Vite 精心设计的插件 API 和丰富的 NPM 包生态系统，入门其实并没有那么难。

本文是对前端开发中自定义文件扩展名及其与 VSCode 集成的探索。作为额外的收获，我们还将简要介绍 SSR/SSG。深入探讨自定义语法超出了本文的范围，我们将专注于一种通过利用现有工具和一些自定义插件来实现类似结果的更实用、更容易上手的方法。

在阅读本文之前，你可能需要对 Vite 和 Vue 有一个基本的了解。如果你对 `inject`、`provide`、`SSRContext` 和 `glob import` 等术语感到困惑，也没有详细的解释。如果你感到困惑，请查看 [Vite](https://vite.dev/) 和 [Vue](https://vuejs.org/) 的官方文档。也可以咨询 LLM 寻求帮助！

## 设置项目

### 脚手架

首先，让我们用 Vite 和 Vue 创建一个项目。在本文的其余部分，我们将使用 Bun.js (`bun`, `bunx`) 作为包管理器，但也应该安装 Node.js 以作为运行时。

```sh
bun create vite@latest gallery
│
◇  Select a framework:
│  Vue
│
◇  Select a variant:
│  TypeScript
```

在 VSCode 中打开项目文件夹，然后启用 [Vue (Official)](vscode:extension/Vue.volar) 扩展。**一个小提醒**：如果 VSCode 抱怨找不到 `*.vue` 文件的类型定义，请重新加载窗口并让 Volar 接管 TypeScript 智能感知。

我们将在这个项目中使用 **UnoCSS** 和 **YAML**，所以你也应该安装并启用这些扩展：

- [**UnoCSS** by Anthony Fu](vscode:extension/antfu.unocss)
- [**YAML** by Red Hat](vscode:extension/redhat.vscode-yaml)

### 设置 UnoCSS 和 Vue Router

极其详细地介绍 UnoCSS 和 Vue Router 的安装和配置不在本文的范围内，所以我们将只展示在这个项目中使用的配置。有关如何配置 UnoCSS 和 Vue Router 的更多信息，请参考官方入门指南：

- [UnoCSS Vite 插件](https://unocss.dev/integrations/vite)
- [Vue Router 入门](https://router.vuejs.org/guide/)

对于本项目来说，UnoCSS 并不是必须的，你可以随意使用任何其他 CSS 框架，或者只使用纯 CSS。但是下面的示例可能包含使用 UnoCSS 的代码。

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

:::: info 如果 VSCode 抱怨 "Cannot find module 'virtual:uno.css' or its corresponding type declarations."（找不到模块 'virtual:uno.css' 或其对应的类型声明。）

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
  // 当我们进入 GalleryView 时重置滚动位置
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

## 模型设计

是时候为我们的画廊设计一个合适的模型了。

首先，我们需要两种类型：`Gallery`（画廊）和 `Image`（图片）。`Gallery` 类型应该包含一个图片数组和一些元数据，如 `location`（位置）和 `date`（日期），`Image` 类型应该包含图片的 URL，以及关于图片的一些元数据，如 `title`（标题）和 `description`（描述）。

此外，我们希望为 `GalleryView` 采用三栏视图，因此最好在加载图片之前知道图片的尺寸，否则会出现许多布局偏移。因此，`Image` 类型还应该包含 `width`（宽度）和 `height`（高度）。这两个属性将被标记为可选，并将由我们的插件自动填充。

我们最终的选择是：
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

为了省去像 `import Cat from './assets/cat.jpeg'` 这样导入图片的麻烦，我们只需将图片放在 `/public` 下，并在 `Image.imageSrc` 中引用它们，如 `/cat.jpeg`。

然而，我们完全可以编写一个插件来帮助我们处理导入，稍后你就会看到。

## 自定义文件扩展名 `*.gallery`

现在我们需要描述画廊。我们希望将这些类似数据库的文件放在项目根目录下的 `data` 文件夹中。但是如何描述这些画廊呢？

### TypeScript？

TypeScript 非常适合编写类型安全的代码，以及表示常见的数据结构，但不一定适合实际描述数据。例如，如果我们需要用 TypeScript 描述一个画廊：

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

如果我们不需要任何补全，这还不错。但是如果我们需要補全，首先需要从 `@/model` 导入 `import type { Gallery }`，然后将光标移动到对象的末尾并添加 `satisfies Gallery`，最后补全才会工作。

### JSON？

Vite 内置支持 [JSON 导入](https://vite.dev/guide/features#json)。然而，JSON 文件编写起来并不那么人性化（那些双引号！），并且需要 JSON schema 才能进行补全。既然 JSON schema 现在几乎是强制性的，为什么不使用一种更人性化的格式呢？

### XML？

拜托，现在是 2026 年了！

### YAML！

我们将使用 YAML 来描述我们的画廊。它简洁且易于编写。此外，Red Hat YAML 扩展允许使用给定的 JSON schema 进行验证和补全。

使用 YAML，现在画廊看起来像这样：

```yaml
location: Tokyo
date: 2026-02-16
images:
  - imageSrc: /tokyo/tokyo-tower.jpg
    title: Tokyo Tower
    description: A famous landmark in Tokyo.
```

普通的 `*.yaml` 扩展名很无聊。而且，我总是忘记是使用 `*.yaml` 还是 `*.yml`，所以我们需要在代码中处理这两种情况。那就让我们创建一个自定义扩展名吧！如果我们在本文中选择了 `*.gallery` 扩展名。

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

## `*.gallery` 文件的编辑器设置

为了让 VSCode 对我们~~新~~格式感到满意，我们需要在这里更改一些设置。首先，我们需要将 `*.gallery` 扩展名与 YAML 关联，以便 YAML 扩展可以在我们的文件扩展名上工作。然后我们需要配置 YAML 扩展以将 `*.gallery` 文件与 JSON schema 关联，以便补全和验证即使工作。

为了方便起见，这里提供了基于 JSON 的设置：

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

将上述内容添加到 `.vscode/settings.json` 中，立即为你完成上述两个步骤。如果你更喜欢使用 VSCode 设置 UI，你也可以修改设置，但请务必选择“工作区”，以免设置搞乱你的全局用户设置。

现在让我们生成 JSON schema 文件 `gallery.schema.json`。幸运的是，我们已经有一些 NPM 包可以做到这一点。

```sh
bun install -D ts-json-schema-generator
ts-json-schema-generator --path src/model/index.ts --type Gallery --out gallery.schema.json
```

:::expander Generated gallery.schema.json

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

在 `data/` 下创建一个 `*.gallery` 文件，补全现在应该可以工作了。

## `*.gallery` 文件的后端集成

现在我们需要为我们的新扩展名配置我们的前端项目。

### 编写一个 Vite 插件

默认情况下，我们不能直接导入 `*.yaml` 文件，更不用说我们的 `*.gallery` 文件了。我们需要编写一个 Vite 插件，将 `*.gallery` 文件转换为 JavaScript。

首先，安装 `yaml` NPM 包。

```sh
bun install -D yaml
```

然后我们搭建我们的插件：

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

别忘了将 `plugin/*.ts` 添加到 `tsconfig.node.json`。

代码本身很容易解释：如果 `id` 以 `.gallery` 结尾，我们要么用 `yaml` 解析它，并构造一段 JavaScript 代码，将对象作为默认导出导出；否则，我们什么也不做。我们使用 `JSON.stringify()` 来获取画廊对象的正确代码表示，这要归功于 JSON 和 JavaScript 之间的兼容性。如果我们跳过这一步，我们将得到类似 `export default [object Object]` 的东西，这当然不是有效的 JavaScript。

我们可以在这里做更多！

请记住，在 Vite 项目中，你的代码在两个不同的环境中运行：

- 所有与代码转换相关的（如插件）都在本地 Node.js 环境中运行，可以访问本地文件。
- 你的前端代码（如 `*.vue` 和这里的 `*.gallery` 文件）在 Node.js 环境中转换为 JavaScript，并发送到浏览器执行（无法访问本地文件）。

我们**不能**在接收到实际图片之前在浏览器中检索图片尺寸，但是我们**可以**在发送实际图片之前发送图片尺寸，这可以通过我们的插件来完成。

例如，使用 NPM 包 `image-dimensions`，我们可以做类似的事情

```ts
for (const image of gallery.images) {
  const imagePath = `./public${image.imageSrc}`
  const imageStream = ReadableStream.from(createReadStream(imagePath))
  const dimensions = await imageDimensionsFromStream(imageStream)
  image.width = dimensions?.width
  image.height = dimensions?.height
}
```

在解析 yaml 之后和字符串化对象之前。

返回的代码不仅仅是一个简单的 `export default`。如前所述，我们可以将文件系统上的相对图像文件路径转换为 Vite 发出的最终路径（带有哈希的路径）。这可以通过发出如下代码来实现

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

如果你需要一点练习，试着实现这个！

### 导入画廊文件

现在 Vite 可以处理我们的 `*.gallery` 文件了，是时候将它们实际导入到我们的代码中了。要一次性导入所有画廊，我们将使用 [glob import](https://vite.dev/guide/features#glob-import) 功能。

为了保持简单，我们将急切地导入所有画廊文件。

```ts
// main.ts
const galleries = import.meta.glob<{ default: Gallery }>('./*.gallery', {
  eager: true,
  base: '../data/',
})
```

期望 `galleries` 对象类似于：

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

其中每个 `default` 都是从 `*.gallery` 文件解析出的对象。

我们将 `galleries` 对象注入到应用程序实例中，以便我们可以在任何地方访问它。现在 main.ts 应该看起来像：

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
  // 当我们进入 GalleryView 时重置滚动位置
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

`GalleryInjectionKey` 在 `src/keys.ts` 中定义为

```ts
export const GalleryInjectionKey = Symbol('galleries') as InjectionKey<
  Record<string, { default: Gallery }>
>
```

以提供类型安全的注入。

### 实现视图

这一部分超出了文章的范围，所以我将非常简略地以此为例。

在 `src/views/HomeView.vue` 中，我们遍历注入的画廊中的所有项目：

```vue
<script setup lang="ts">
// import ...

const galleries = Object.entries(inject(GalleryInjectionKey)!).map(([k, v]) => {
  // 这里的正则表达式捕获 "./foo.gallery" 中的 foo，
  // 所以画廊的路径可能是 "/gallery/foo"。
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

在 `src/views/GalleryView.vue` 中，我们检索 `id` 参数并相应地显示内容。

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
          >Return to Home</RouterLink
        >
      </p>
    </div>
    <div flex-1></div>
    <Footer mt-12 />
  </main>
</template>
```

你可以实现自己的 `GalleryCard` 和 `ImageCard` 版本。

## 让我们的项目静态生成

:::info 来源
本节中的部分代码取自 https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js 和 https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/src/entry-server.js.

请阅读 [Vite 官方指南](https://vite.dev/guide/ssr)。它以更清晰的方式涵盖了以下大部分内容。
:::

这个项目非常适合演示 SSG。

1. 我们实际上不需要任何 JavaScript 来显示照片。
2. 一旦我们将每个路由预渲染，与导航相关的 JavaScript 也可以被消除。
3. 使用 JavaScript 进行水合可以在一定程度上改善用户体验，但这不是必需的。

为了让我们的项目准备好 SSG，我们需要首先让它准备好 SSR。

### 迁移到 SSR

1. 将 `src/main.ts` 重命名为 `src/app.ts`，然后创建 `entry-client.ts` 和 `entry-server.ts`
2. 在 `index.html` 中，将 `src/main.ts` 替换为 `src/entry-client.ts`
3. 在 `index.html` 中，在 `div#app` 内添加 `<!--app-html-->`，在 `head` 中添加 `<!--preload-links-->`。
4. 重构 `src/app.ts`，将 `createRouter()` 和 `createApp()` 部分包装在一个函数中。现在文件应该看起来像
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

5. 在 `src/entry-client.ts` 中，只需创建应用程序并挂载它

   ```ts
   import { createApp } from './app'

   createApp().app.mount('#app')
   ```

6. 在 `src/entry-server.ts` 中，实现将 `App` 渲染为字符串的逻辑

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

7. 确保在 `script setup` 中使用 SSR 友好的代码，并将所有仅客户端的内容包装在 `onMounted` 等钩子中

8. 修改 `package.json`

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

### 生成页面

首先，我们弄清楚需要预渲染的路由。这里，我们使用 `fast-glob`。

```ts
import fg from 'fast-glob'

const routes = await fg('data/*.gallery', { objectMode: true }).then((x) =>
  x.map(({ name }) => {
    const id = name.replace(/\.gallery$/, '')
    return `/gallery/${id}`
  }),
)

routes.push('/')
```

然后我们渲染并保存页面。

```ts
// 应该是构建结果
const render = (await import('../dist/server/entry-server.js' as string).then(
  (mod) => mod.render,
)) as (path: string) => Promise<{ html: string; ctx: Record<string, any> }>
// 同样，应该是构建结果
// (src/entry-client.ts 现在是其他东西，比如 /assets/index-A9a30asf.js!)
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
  const filePath = 'dist/client' + (route === '/' ? '/index.html' : `${route}.html`)
  const fileDir = dirname(filePath)
  await fs.mkdir(fileDir, { recursive: true })
  await fs.writeFile(filePath, finalHtml, 'utf-8')
}

function renderPreloadLinks(modules: Set<string>, manifest: { [key: string]: string[] }) {
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

现在你可以部署 `dist/client` 文件夹了！访问者现在即使没有 JavaScript 也可以访问你的画廊。

### 关于 SSG 的一些提示

你可能会遇到这种情况：你想更改 `GalleryView` 的标题。然而在服务端，你无法访问 DOM API。

这个技巧可能在这样的场景中有所帮助（更改标题、语言等）：

1. 在 `script setup` 中，使用 `useSSRContext()` 检索 SSR 上下文
2. 将属性写入上下文对象
3. 在 `index.html` 中添加占位符，如 `<title><!--title--></title>`
4. 在预渲染脚本中，将 HTML 模板中的占位符替换为 SSR 上下文 `ctx` 中的值
5. 记得将所有内容包装在 `if (import.meta.env.SSR)` 中以使 tree-shaking 成为可能

这避免了在 `script setup` 中调用 DOM API。但是，你仍然需要在 `onMounted` 等钩子中使用 DOM API 处理它，否则，客户端水合后标题将不会更改。

Vue 侧用于动态标题的完整版本是：

```vue
<script setup lang="ts">
useTitle('Galleries')
if (import.meta.env.SSR) {
  const ctx = useSSRContext()
  if (ctx) {
    ctx.title = 'Galleries'
  }
}
</script>
```

## 结论

在本文中，我们使用 Vite 和 Vue 创建了一个照片库，围绕自定义文件扩展名 `*.gallery` 展开。我们配置了 VSCode 以识别此文件扩展名，并编写了一个 Vite 插件将其转换为 JavaScript。最后，我们将我们的项目转换为静态生成的站点。

这只是一个简单的演示，但本文中提到的技术可以应用于更复杂的场景。例如，你可以编写一个插件将 markdown 文件转换为 Vue 组件，并让 Vue 插件处理其余的工作。这就是 [VitePress](https://vitepress.dev/) 的工作原理，同样的技术也驱动着生成你正在阅读的页面的自定义 SSG！此外，如果你对 YAML 格式不满意，你也可以修改插件以支持你自己的格式，如 TOML 甚至自定义格式。

该项目的完整源代码可以在 https://github.com/illusionaries/gallery 找到，在线演示在 https://gallary.illusion.blog。感谢阅读！
