---
title: '文件扩展名、VSCode、Vue、Vite 与 SSG：写一个相册'
time: 2026-02-17
tags:
  - Frontend
  - Vite
  - VSCode
lang: zh-CN
---

通过构建一个相册项目，本文将探索自定义文件扩展名在 Vite 与 Vue 中的运用，以及如何在 VSCode 中配置该扩展名的支持。最后，我们还会将此 SPA 项目转换为静态生成的站点。

---

:::info 图一乐
本文由[英文版本](../en/)古法手工翻译而来，原文英文是因为我很懒不想切输入法。翻译水平捉襟见肘还请见谅。

本文还有两个由 Gemini 3 Pro 师傅翻译的版本：

- [G 体中文（书面）](../zh-gemini-formal/)
- [G 体中文（口语）](../zh-gemini-informal/)

虽然我自己翻译的版本很难绷，但是这两个版本我觉得更难绷，故放于此处供各位图一乐。

:::

[English Version](../en/)

## 前言

写一个 Vite 插件可能初看很吓人，但得益于精巧的 Vite 插件 API 的与丰富的 NPM 生态，可能也没那么难上手。

本文将探索自定义扩展名在前端技术栈中的运用，及与其相关的 VSCode 的配置技巧。我们亦将粗略介绍 SSR（服务端渲染）与 SSG（静态站点生成）。本文不会深入探讨自定义语法与格式，而是在现有的工具工具基础上稍加开发，实现类似的效果。

开始阅读之前，你最好有些 Vite 和 Vue 的基础知识。一些名词（例如 `inject`、 `provide`、`SSRContext`、`glob import` 等）可能会直接使用而不加解释。不是很了解的话，你可以查阅 [Vite](https://cn.vite.dev/) 和 [Vue](https://cn.vuejs.org/) 的文档，也可以寻求大语言模型的帮助！

## 配置项目

### 创建项目

我们先来创建一个 Vite & Vue 项目。本文使用的包管理器是 Bun.js (`bun`, `bunx`)。除此之外，处于兼容性的考虑，你可能也需要安装 Node.js 作为运行时环境。

```sh
bun create vite@latest gallery
│
◇  Select a framework:
│  Vue
│
◇  Select a variant:
│  TypeScript
```

在 VSCode 中打开项目文件夹并启用 [Vue (Official)](vscode:extension/Vue.volar) 扩展. **小提示**：如果 VSCode 说找不到 `*.vue` 或其类型声明，你需要重新加载窗口让 Volar 接管 TypeScript IntelliSense。

本项目会使用 **UnoCSS** 和 **YAML**，现在可以顺便安装并启用这两个插件：

- [**UnoCSS** by Anthony Fu](vscode:extension/antfu.unocss)
- [**YAML** by Red Hat](vscode:extension/redhat.vscode-yaml)

### 配置 UnoCSS 和 Vue Router

本文并不准备详细介绍如何配置 UnoCSS 和 Vue Router，仅展示所用的配置文件。请查阅官方文档了解配置的详细说明：

- [UnoCSS Vite Plugin](https://unocss.dev/integrations/vite)
- [Vue Router Getting Started](https://router.vuejs.org/zh/guide/)

UnoCSS 并非必须，你也可以使用其他的 CSS 框架，或者也可以只使用原生 CSS，只是之后可能会出现使用了 UnoCSS 的示例代码。

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

:::: info 如果 VSCode 报错 “找不到模块 'virtual:uno.css' 或其类型声明”

:::expander vite-env.d.ts

```ts
/// <reference types="vite/client" /> // [!code ++]
```

:::

::::

:::expander src/main.ts

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
  // 导航到相册视图时重置滚动位置
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

该来设计数据模型了。

显然我们需要两种类型：`Gallery` 和 `Image`。 `Gallery` 需要包含一组图片和一些元数据（例如 `location` 和 `date`）。`Image` 需要包含图片地址和图片相关的另一些元数据（例如 `title` 和 `description`）。

我想在 `GalleryView` 中使用三列的布局，所以最好在图片加载之前就确定图片的尺寸，不然就会有一堆布局瞬移。这样的话，`Image` 还要包含 `width` and `height` 属性。这两个属性会被标记为可选，随后我们会用插件实现自动填充尺寸的功能。

下面是我们采用的数据模型
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

为每张图片素材编写 Vite 标准的导入语句（`import Cat from './assets/cat.jpeg'`）好麻烦，这里我们就直接把照片放在 `/public` 下面，`Image.imageSrc` 填入 `/cat.jpeg`。

虽然但是，如果真要采用导入路径的方法，我们也可以采用编写插件的方式自动化这个过程，接下来也会提到这个部分。

## 自定义文件扩展名 `*.gallery`

该来描述相册了。这些像是数据库一样的、描述单个相册的文件会被放在项目根目录下的 `data` 文件夹。但是，这些文件该采用什么格式呢？

### TypeScript?

如果是编写类型安全的代码，或者描述一个通用的数据结构，TypeScript 完全能够胜任。但是如果要具体描述数据内容，TypeScript 就显得有些麻烦了。如果我们想用 TypeScript 描述一个相册：

```ts
export default {
  location: '东京',
  date: '2026-02-16',
  images: [
    {
      imageSrc: '/tokyo/tokyo-tower.jpg',
      title: '东京塔',
      description: '东京著名地标。',
    },
  ],
}
```

看上去还好，可是没有类型的自动补全。如果想要补全的话，我们得先 `import type { Gallery } from '@/model'`，然后把光标移到最后，写上 `satisfies Gallery`，最后才开始写内容。怪怪的。

### JSON?

Vite 内置支持 [JSON 导入](https://cn.vite.dev/guide/features#json)。可是对于人类而言，JSON 没那么好写（太多引号了！~~中文用户还要切换半角！~~）。如果想要补全的话，还需要提供一个 JSON schema。这样的话，不如就挑一个更适合人类书写的格式。

### XML?

大哥，2026年了！

### YAML!

我们会使用 YAML 来描述我们的相册。YAML 干净、易写，而且来自 Red Hat 的 YAML 扩展也能通过 JSON schema 实现 YAML 的补全和验证。

用 YAML 描述的一个相册如下：

```yaml
location: 东京
date: 2026-02-16
images:
  - imageSrc: /tokyo/tokyo-tower.jpg
    title: 东京塔
    description: 东京著名地标。
```

单纯的 `*.yaml` 扩展名好无聊，而且我永远会忘记之前用的是 `*.yaml` 还是 `*.yml`，然后就得在代码里处理两种情况。我有个主意：新造个扩展名，就叫 `*.gallery` 好了！

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

## `*.gallery` 扩展名的编辑器设置

为了能在 VSCode 中愉快地使用我们这个~~新~~个事，我们首先要更改一些设置。首先，我们要把 `*.gallery` 这个扩展名关联 YAML 格式，这样 YAML 扩展才会在这个文件扩展名上激活；之后配置 YAML 扩展，关联 `*.gallery` 文件与我们给定的 JSON schema 来获得补全和验证功能。

为方便起见，JSON 格式的设置内容如下：

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

将上述内容加入到 `.vscode/settings.json` 会为当前工作区完成前文提到的两个步骤。你也可以选择在 VSCode 的设置中手动完成这两步，但请确保更改设置时选择了 “工作区” 选项，不然会扰乱全局的其他配置。

关于 `gallery.schema.json`，NPM 上有不少现成的工具可以完成从 TypeScript 定义到 JSON schema 的生成。

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

在 `data/` 目录下创建一个 `*.gallery` 文件，补全应该已经正常工作了。

## `*.gallery` 文件的前端集成

现在是前端代码时间。

### 写一个 Vite 插件

默认情况下我们不能直接在 Vite 中导入 `*.yaml` 文件，更别说是 `*.gallery` 了。我们需要写一个 Vite 插件实现 `*.gallery` 文件到 JavaScript 模块的转换。

首先，安装 `yaml` 包:

```sh
bun install -D yaml
```

然后飞速完成我们的插件：

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

别忘了把 `plugin/*.ts` 加入到 `tsconfig.node.json` 中。

这段代码比较清晰明了：如果 `id` 以 `.gallery` 结尾，我们就用 `yaml` 解析它，并构造一段 JavaScript 代码把这个对象作为默认导出；否则，我们什么都不做。得益于 JSON 与 JavaScript 的兼容性，`JSON.stringify()` 能帮助我们得到 gallery 对象的正确代码表示。如果跳过这一步，我们会得到类似 `export default [object Object]` 的结果，显然，这不是合法的 JavaScript。

我们可以在这里实现更多功能！

请记住，一个 Vite 项目中存在着两套代码运行环境：

- 代码转换相关的东西（例如插件）在 Node.js 环境中运行，可以访问到本地文件。
- 前端代码（例如 `*.vue` 和这里的 `*.gallery` 文件）在 Node.js 环境中被转换成 JavaScript，随后发送到浏览器执行，无法直接访问本地文件。

在浏览器端，我们**做不到**在加载图片之前获得图片的尺寸，但是我们**可以**在发送图片之前就发送图片的尺寸。

还记得先前留空的两个字段吗？使用 NPM 包 `image-dimensions`，我们可以实现如下功能：

```ts
for (const image of gallery.images) {
  const imagePath = `./public${image.imageSrc}`
  const imageStream = ReadableStream.from(createReadStream(imagePath))
  const dimensions = await imageDimensionsFromStream(imageStream)
  image.width = dimensions?.width
  image.height = dimensions?.height
}
```

这段代码应当放在解析 YAML 的代码之后，构造 JavaScript 代码之前。这样，我们就能在前端代码中直接使用 `image.width` 和 `image.height` 了。

另外，返回的 JavaScript 代码也可以远不止一个简单的 `export default` 语句。前文提到过，我们可以将图片的相对路径转换为 Vite 构建后的（带哈希值后缀的）路径。你可以返回差不多这样的一段代码实现这个功能：

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

看到这里，如果你觉得需要一点小练习的话，试试这个！

### 导入相册文件

既然现在 Vite 已经可以处理我们的 `*.gallery` 文件，那就该在前端代码中真正导入它们了。使用 [glob import](https://cn.vite.dev/guide/features#glob-import) 功能，我们一次性导入所有 `*.gallery` 文件。

为保持简洁，我们采用 eager 模式导入所有的相册文件。

```ts
// src/main.ts
const galleries = import.meta.glob<{ default: Gallery }>('./*.gallery', {
  eager: true,
  base: '../data/',
})
```

构建后的 `galleries` 对象大概长这样：

```ts
const galleries: Record<string, { default: Gallery }> = {
  './tokyo.gallery': {
    default: {
      location: '东京',
      date: '2026-02-16',
      images: [
        {
          imageSrc: '/tokyo/tokyo-tower.jpg',
          title: '东京塔',
          description: '东京著名地标。',
          width: 1920,
          height: 1080,
        },
        // ...
      ],
    },
  },
  './shanghai.gallery': {
    default: {
      location: '上海',
      date: '2026-01-01',
      // ...
    },
  },
  // ...
}
```

每个 `default` 属性都源于 `*.gallery` 文件的解析结果。

把 `galleries` 对象注入（`inject`）到应用实例中，这样全局都可以访问到它。目前的 `src/main.ts` 应该长这样：

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
  // 导航到相册视图时重置滚动位置
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

为了实现类型安全的注入，`GalleryInjectionKey` 定义在了 `src/keys.ts` 中：

```ts
export const GalleryInjectionKey = Symbol('galleries') as InjectionKey<
  Record<string, { default: Gallery }>
>
```

### 实现视图

Vue 该怎么写并非本文的主题，不过我们可以简单展示一下如何在 Vue 组件中使用 `galleries` 对象。

在 `src/views/HomeView.vue` 中，我们遍历 `galleries` 中的所有项：

```vue
<script setup lang="ts">
// import ...

const galleries = Object.entries(inject(GalleryInjectionKey)!).map(([k, v]) => {
  // 这里的正则捕获 "./foo.gallery" 中的 foo,
  // 这样相册的的路径就可以是 "/gallery/foo"
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

在 `src/views/GalleryView.vue` 中，获取路径中的 `id` 参数并显示相应的内容。

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

请随意实现 `GalleryCard` 和 `ImageCard`.

## 静态生成

:::info 来源
本节的代码大量取自 https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js 和 https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/src/entry-server.js.

[Vite 官方指南](https://cn.vite.dev/guide/ssr) 中详尽介绍了大部份下述的 SSR 部分，烦请阅读官方指南以获得更深入的理解。

一些现成的工具，例如 [vite-plugin-ssg](https://vite-plugin-ssr.com/) 可能会帮你完成这个过程，可惜我并没有尝试过。敬请自行探索这些工具。
:::

本项目非常适合演示静态站点生成（SSG）。

1. 显示照片不需要任何 JavaScript；
2. 预渲染所有可能的页面之后，导航相关的 JavaScript 代码也不再是必需；
3. [水合（客户端激活）](https://cn.vuejs.org/guide/scaling-up/ssr#client-hydration)后的页面可能能提供更好的用户体验，但这并非必需。

在 SSG 之前，我们先要确保本项目可以支持 SSR。

### 迁移到 SSR

1. 将 `src/main.ts` 重命名为 `src/app.ts`，然后创建 `entry-client.ts` 和 `entry-server.ts`；
2. 在 `index.html` 中，将 `src/main.ts` 替换为 `src/entry-client.ts`；
3. 在 `index.html` 中，把 `<!--app-html-->` 写入 `div#app` 元素中、`<!--preload-links-->` 写入 `head` 元素中；
4. 重构 `src/app.ts`，把 `createRouter()` 和 `createApp()` 的部分用函数包裹。现在这个文件大概长这样：
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

5. 在 `src/entry-client.ts` 中，调用 `createApp()` 并挂载到 DOM 上：

   ```ts
   import { createApp } from './app'

   createApp().app.mount('#app')
   ```

6. 在 `src/entry-server.ts` 中，实现渲染 `App` 为字符串的逻辑：

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

7. 确保 `script setup` 中的代码都是 [SSR 友好的](https://cn.vuejs.org/guide/scaling-up/ssr#writing-ssr-friendly-code)，把所有的客户端相关代码包裹在 `onMounted` 等钩子中；

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

:::info 有关 SSR/SSG
如果你已经通读 [Vite 关于 SSR 的官方指南](https://cn.vite.dev/guide/ssr)，你可能注意到了一部分 `render.ts` 的代码摘自官方指南中的 `entry-server.js`，而我们的 `entry-server.ts` 则删除了这段代码。

这段代码负责将渲染出的 HTML 片段（放入 `<div id="app"></div>` 中的）和预加载链接组合成最终的完整 HTML。这段代码放在哪里并不重要，只需确保它在预渲染过程中被正常执行即可。
:::

### 生成页面

首先需要确定哪些页面需要预渲染。这里，我们使用 `fast-glob`：

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

随后我们渲染并写入每个页面：

```ts
// should be the build result
const render = (await import('../dist/server/entry-server.js' as string).then(
  (mod) => mod.render,
)) as (path: string) => Promise<{ html: string; ctx: Record<string, any> }>
// also, should be the build result
// (src/entry-client.ts is now something else like /assets/index-A9a30asf.js!)
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

现在可以部署 `dist/client` 文件夹了！即使是没有 JavaScript 运行环境的浏览器也能正常显示页面。

### SSG 的一些小贴士

你可能会想修改 `GalleryView` 页面的标题（又或者是想要更改 html 的 `lang` 属性）。但在服务器端，我们无法访问 DOM API。下面的这个技巧可能会帮到你：

1. 在 Vue 组件的 `script setup` 中，使用 `useSSRContext()` 获取 SSR Context；
2. 将值写入 SSR Context 的某个属性中；
3. 在 `index.html` 中写入一个占位符，例如 `<title><!--title--></title>`；
4. 在预渲染脚本中，将 HTML 模板中的占位符替换为 SSR Context 中的值；
5. 记得将所有逻辑包裹在 `if (import.meta.env.SSR)` 中，这样构建工具可以帮助我们 tree-shaking。

这能帮我们避开在 `script setup` 中使用 DOM API 的问题。不过也请注意，你仍然需要在 `onMounted` 等钩子中使用 DOM API 再次处理这个问题，否则在客户端水合之后标题就不会改变了。

在 Vue 组件端，一个动态改变页面标题的例子如下：

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

## 总结

本文围绕一个自定义的文件扩展名 `*.gallery` 构建了一个完整的基于 Vite & Vue 的相册，并为支持这个扩展名配置了 VSCode、编写了 Vite 插件。最后，我们把这个 SPA 项目转换成了一个静态生成的站点。

虽然本文仅仅是一个小小的 demo，但文中提到的技术可以应用到更复杂的场景中。例如，你可以编写一个插件将 markdown 文件转换成 Vue 组件，并让 Vue 插件处理剩下的工作。这正是 [VitePress](https://vitepress.dev/zh/) 和生成本页面的静态站点生成器所遵循的工作原理！如果你不喜欢 YAML 格式，你也可以修改插件来支持你自己的格式，它可以是 TOML，甚至是一个完全自定义的格式。

本项目的完整源代码托管在 https://github.com/illusionaries/gallery<!--break link-->，也可以访问 https://gallary.illusion.blog 查看在线 demo。感谢阅读！
