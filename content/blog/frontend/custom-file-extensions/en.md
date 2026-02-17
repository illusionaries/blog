---
title: 'File Extensions, VSCode, Vue, Vite and SSG: Building a Photo Gallery'
time: 2026-02-16
tags:
  - Frontend
  - Vite
  - VSCode
lang: en
---

In this article, we will explore how to create a photo gallery using Vite & Vue, and how to configure VSCode to recognize custom file extensions. Finally, we are going to convert the project from a SPA into a statically generated site.

---

[简体中文](../zh/)

## Introduction

For beginners, authorizing a Vite plugin might seem an intimidating task. However, with Vite's well-designed plugin API and the rich ecosystem of NPM packages, it is not that hard to get started.

This article is an exploration of custom file extensions in frontend development and its integration with VSCode. As a bonus, we would also briefly introduce SSR/SSG. Diving deep into custom grammars is beyond the scope of this article, and we would rather focus on a more practical and approachable way to achieve a similar result by leveraging existing tools and some custom plugins.

Before reading this article, you might need to have a basic overview of Vite and Vue. Some terms such as `inject`, `provide`, `SSRContext`, and `glob import` are used without detailed explanations. If you are confused, check out the official documentations of [Vite](https://vite.dev/) and [Vue](https://vuejs.org/). Also consult LLMs for help!

## Setting up the Project

### Scaffolding

First, let's create a project with Vite & Vue. We will be using Bun.js (`bun`, `bunx`) as the package manager for the rest of the article, but Node.js should also be installed to serve as a runtime.

```sh
bun create vite@latest gallery
│
◇  Select a framework:
│  Vue
│
◇  Select a variant:
│  TypeScript
```

Open the project folder in VSCode, then enable the [Vue (Official)](vscode:extension/Vue.volar) extension. **As a small reminder**: if VSCode complains about not finding type definitions for `*.vue` files, reload the window and let Volar take over TypeScript IntelliSense.

We will be using **UnoCSS** and **YAML** for this project, so you may install and enable these extensions as well:

- [**UnoCSS** by Anthony Fu](vscode:extension/antfu.unocss)
- [**YAML** by Red Hat](vscode:extension/redhat.vscode-yaml)

### Setting up UnoCSS & Vue Router

Going through the installation and configuration of UnoCSS & Vue Router in extreme detail is not within the scope of this article, so we will show only the configuration used in this project. For more information about how to configure UnoCSS & Vue Router, consult the official getting started guides:

- [UnoCSS Vite Plugin](https://unocss.dev/integrations/vite)
- [Vue Router Getting Started](https://router.vuejs.org/guide/)

UnoCSS isn't necessary for this project, feel free to use any other CSS frameworks, or just use plain CSS. But the example below may contain code that uses UnoCSS.

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

:::: info If VSCode complains "Cannot find module 'virtual:uno.css' or its corresponding type declarations."

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
  // reset scroll position when we enter GalleryView
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

## Model Design

Time to design a proper model for our gallery.

First, we need two types: `Gallery` and `Image`. The `Gallery` type should contain an array of images and some metadata like `location` and `date`, and the `Image` type should contain the URL of the image, and some metadata about the image such as `title` and `description`.

Also, we would like to adopt a three-column view for the `GalleryView`, so it would be better to know the dimensions of an image before it is loaded, or we would have many layout shifts. Thus, the `Image` type should also contain `width` and `height`. These two properties will be marked as optional and will be automatically filled by our plugins.

Our final choice would be:
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

To save us the hassle of importing images, like `import Cat from './assets/cat.jpeg'`, we will just place the images under `/public` and reference them in `Image.imageSrc` as `/cat.jpeg`.

However, it is totally possible to write a plugin to help us deal with imports, as you will see in a moment.

## Custom File Extension `*.gallery`

Now we need to describe the galleries. We would like to place these database-like files in the `data` folder, right at the project root. But how to describe these galleries?

### TypeScript?

TypeScript is great for writing type-safe code, and for representing common data structures, but not necessarily good for actually describing the data. For example, if we need to describe a gallery in TypeScript:

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

Not that bad if we don't need any completions. But if we do, we first need to `import type { Gallery } from '@/model'`, then move the cursor to the end of the object and add `satisfies Gallery`, and finally completions will work.

### JSON?

Vite has built-in support for [JSON imports](https://vite.dev/guide/features#json). However, JSON files are not that human-friendly to write (those double quotes!), and require a JSON schema for completions to work. Since a JSON schema is kind of mandatory now, why not use a more human-friendly format?

### XML?

Come on, it's 2026 now!

### YAML!

We would be using YAML to describe our galleries. It is clean and easy to write. Moreover, the Red Hat YAML extension allows for verification and completion with a given JSON schema.

With YAML, now a gallery would look like:

```yaml
location: Tokyo
date: 2026-02-16
images:
  - imageSrc: /tokyo/tokyo-tower.jpg
    title: Tokyo Tower
    description: A famous landmark in Tokyo.
```

Plain `*.yaml` extensions are boring. Moreover, I always forget whether to use `*.yaml` or `*.yml`, so we need to handle both cases in code. Let's just create a custom extension then! We choose the extension `*.gallery` here.

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

## Editor Setup for `*.gallery` Files

To make VSCode happy with our ~~new~~ format, we have to change a few settings here. First, we need to associate the `*.gallery` extension with YAML, so the YAML extension will work on our file extension. Then we need to configure the YAML extension to associate the `*.gallery` files with a JSON schema so completions and verifications will work.

For convenience, JSON-based settings are provided here:

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

Adding the above content to `.vscode/settings.json` immediately completes the two steps above for you. You can also modify the settings with the VSCode Settings UI if you prefer, but make sure to select "Workspace" so the settings do not mess around with your global user settings.

Now let's generate the JSON schema file `gallery.schema.json`. Luckily, we already have a few NPM packages to do that.

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

Create a `*.gallery` file under `data/`, completions should now work.

## Frontend Integration for `*.gallery` Files

Now we need to configure our frontend project for our new extension.

### Authoring a Vite Plugin

By default, we cannot import `*.yaml` files directly, let alone our `*.gallery` files. We need to write a Vite plugin to transform a `*.gallery` file into JavaScript.

First, install the `yaml` NPM package.

```sh
bun install -D yaml
```

Then we scaffold our plugin:

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

Don't forget to add `plugin/*.ts` to `tsconfig.node.json`.

The code itself is quite self-explanatory: if `id` ends with `.gallery`, we parse it with `yaml` and construct a piece of JavaScript code that exports the object as a default export; otherwise, we do nothing. We use `JSON.stringify()` to get a proper code representation of the gallery object, thanks to the compatibility between JSON and JavaScript. If we skip this step, we would get something like `export default [object Object]`, which is of course not valid JavaScript.

We can do more here!

Keep in mind that in a Vite project, your code runs in two different environments:

- Everything related to code transformation (like plugins) is run locally in a Node.js environment, with access to local files.
- Your frontend code (such as `*.vue` and here `*.gallery` files) are transformed in the Node.js environment into JavaScript, and sent to the browser for execution (without access to local files).

We **cannot** retrieve image dimensions in the browser before receiving the actual image, but we **can** send image dimensions before sending the actual image, and this can be done with our plugin.

For example, with the NPM package `image-dimensions`, we can do something like

```ts
for (const image of gallery.images) {
  const imagePath = `./public${image.imageSrc}`
  const imageStream = ReadableStream.from(createReadStream(imagePath))
  const dimensions = await imageDimensionsFromStream(imageStream)
  image.width = dimensions?.width
  image.height = dimensions?.height
}
```

after parsing yaml and before stringifying the object.

Returned code can be much more than a simple `export default`. As previously mentioned, we can convert a relative image file path on our filesystem to the final path emitted by Vite (the one with a hash). This can be done by emitting code like

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

If you need a little bit of exercise, try implementing this!

### Importing Gallery Files

Now Vite can process our `*.gallery` files, so it is time to actually import them into our code. To import all galleries at once, we would use the [glob import](https://vite.dev/guide/features#glob-import) feature.

To keep things simple, we would import all gallery files eagerly.

```ts
// src/main.ts
const galleries = import.meta.glob<{ default: Gallery }>('./*.gallery', {
  eager: true,
  base: '../data/',
})
```

Expect the `galleries` object to be something like:

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

where each `default` is the object parsed from `*.gallery` files.

We inject the `galleries` object into the app instance, so we can access it everywhere. Now `src/main.ts` should look like:

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
  // reset scroll position when we enter GalleryView
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

The `GalleryInjectionKey` is defined in `src/keys.ts` as

```ts
export const GalleryInjectionKey = Symbol('galleries') as InjectionKey<
  Record<string, { default: Gallery }>
>
```

to provide type-safe injection.

### Implementing Views

This part is beyond the scope of the article, so I would rather go through it very briefly.

In `src/views/HomeView.vue`, we iterate over all items in the injected galleries:

```vue
<script setup lang="ts">
// import ...

const galleries = Object.entries(inject(GalleryInjectionKey)!).map(([k, v]) => {
  // the regex here captures the foo in "./foo.gallery",
  // so the path to the gallery could be "/gallery/foo".
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

In `src/views/GalleryView.vue`, we retrieve the `id` param and display content accordingly.

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

You can implement your own version of `GalleryCard` and `ImageCard`.

## Making our Project Statically Generated

:::info Sources
Part of the code in this section is taken from https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js and https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/src/entry-server.js.

Please read the [official guide from Vite](https://vite.dev/guide/ssr). It covers most of the following part in a clearer manner.

There are some existing tools like [vite-plugin-ssg](https://vite-plugin-ssr.com/) that might help you with the process, but I have not tried them out. Feel free to explore these tools by yourselves.
:::

This project is perfect for demonstrating SSG.

1. We don’t actually need any JavaScript to display photos.
2. Once we pre-render every route, navigation-related JavaScript can also be eliminated.
3. [Hydrating with JavaScript](https://vuejs.org/guide/scaling-up/ssr.html#client-hydration) can, to some extent, improve the user experience, but it is not necessary.

To make our project SSG-ready, we need to first prepare it for SSR.

### Migrate to SSR

1. Rename `src/main.ts` to `src/app.ts`, then create `entry-client.ts` and `entry-server.ts`
2. In `index.html`, replace `src/main.ts` with `src/entry-client.ts`
3. In `index.html`, add `<!--app-html-->` inside `div#app`, and `<!--preload-links-->` in `head`.
4. Refactor `src/app.ts` by wrapping the `createRouter()` and `createApp()` parts in a function. Now the file should look like
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

5. In `src/entry-client.ts`, simply create the app and mount it

   ```ts
   import { createApp } from './app'

   createApp().app.mount('#app')
   ```

6. In `src/entry-server.ts`, implement the logic to render `App` to string

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

7. Make sure to use [SSR-friendly code](https://vuejs.org/guide/scaling-up/ssr.html#writing-ssr-friendly-code) in `script setup`, and wrap everything client-only in hooks like `onMounted`

8. Modify `package.json`

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

:::info About SSR/SSG
If you have read through [the official guide of Vite on SSR](https://vite.dev/guide/ssr), you might have noticed that part of our `render.ts` was taken from their `entry-server.js`, and this part got removed in out `entry-server.ts`.

This part is responsible for taking the partially generated HTML (the part in `<div id="app"></div>`) and the preload links to assemble the final, complete HTML. Where to put this piece of code does not really matter, as long as it is executed in the pre-rendering step.
:::

### Generating Pages

First, we figure out the routes that need to be pre-rendered. Here, we use `fast-glob`.

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

Then we render and save the pages.

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

Now you can deploy the `dist/client` folder! Visitors can now visit your gallery even if JavaScript is not available.

### Some Tips on SSG

You might encounter this: you would like to change the title of the `GalleryView`. However on the server side, you do not have access to DOM APIs.

This trick might help in such scenarios (changing title, lang, etc.):

1. In the `script setup` of the desired Vue component, retrieve SSR Context with `useSSRContext()`
2. Write a property to the context object
3. Add a placeholder in `index.html`, such as `<title><!--title--></title>`
4. In the pre-render script, replace the placeholder in the HTML template with the value in SSR Context `ctx`
5. Remember to wrap everything in `if (import.meta.env.SSR)` to make tree-shaking possible

This avoids DOM API calls in `script setup`. However, you still need to handle it with DOM APIs in hooks like `onMounted`, otherwise, the title won't change after client hydration.

A complete version on the Vue side for dynamic titles would be:

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

## Conclusion

In this article, we created a photo gallery with Vite & Vue, centering around a custom file extension `*.gallery`. We configured VSCode to recognize this file extension, and wrote a Vite plugin to transform it into JavaScript. Finally, we converted our project into a statically generated site.

This is just a simple demo, but the techniques mentioned in this article can be applied to more complex scenarios. For example, you can write a plugin to transform markdown files into Vue components and let the Vue plugin handle the rest of the work. This is how [VitePress](https://vitepress.dev/) works, and the same technique powers a custom SSG that generates the page you are reading right now! Also, if you are not satisfied with the YAML format, you can also modify the plugin to support your own format, such as TOML or even a custom format.

The complete source code of the project can be found on https://github.com/illusionaries/gallery, and an online demo is live at https://gallary.illusion.blog. Thanks for reading!
