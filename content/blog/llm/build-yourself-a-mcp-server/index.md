---
title: 写一个 MCP 服务器
time: 2025-08-26
---

如果，我是说如果，我们不让大模型走文生图，而是让他们直接吐坐标画像素画，你觉得会怎么样。

---

## 我想要什么

- 给大模型一个像素画画布，支持
  - 清空
  - 绘制一个像素
  - 绘制一个矩形
  - 绘制一批像素（好吧其实上面两个都能直接用这个解决）
  - 看看画了什么
- 给我一个实时预览的界面，让我不用盯着模型调用的请求在脑子里画画

## 我要用什么

- 你看标题当然是要用 MCP
- TypeScript（怎么别人都用 Python 捏）
- Vue.js（其实就那么个实时预览，你用传统 HTML 也能做，不过我 Vue 写起来会更快一些）

## 什么是 MCP

> MCP is an open protocol that standardizes how applications provide context to large language models (LLMs). Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect your devices to various peripherals and accessories, MCP provides a standardized way to connect AI models to different data sources and tools. MCP enables you to build agents and complex workflows on top of LLMs and connects your models with the world. [^1]

## 前序准备

- [Bun](https://bun.sh/) ~~你知道的我一直是 Bun 的粉丝啊~~
- [Node.js](https://nodejs.org/zh-cn)（你之后会知道为什么要这个的）

## Go go go，实现咯

### 让我们先开个 monorepo

:::info
所有需要你输入的指令，都将以 `$` 开头，其余行均是命令输出，输入命令时，不要带 `$` 符号
:::

```sh
$ mkdir pix-llm
$ cd pix-llm
$ mkdir -p packages/mcp-server
```

:::info
此后，除非特殊指定，所有命令块与代码文件的工作目录均为 `pix-llm`
:::

```sh
$ cd packages/mcp-server
$ bun init
$ bun init
✓ Select a project template: Blank
```

```sh
$ cd packages
$ bun create vue
┌  Vue.js - The Progressive JavaScript Framework
│
◇  请输入项目名称：
│  preview-client
│
◇  请选择要包含的功能： (↑/↓ 切换，空格选择，a 全选，回车确认)
│  TypeScript
│
◇  选择要包含的试验特性： (↑/↓ 切换，空格选择，a 全选，回车确认)
│  none
│
◇  跳过所有示例代码，创建一个空白的 Vue 项目？
│  Yes

$ cd packages/preview-client
$ bun install
```

:::expander package.json

```json
{
  "name": "pix-llm",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"]
}
```

:::

### 初步的设想

除了在 mcp-server 中实现一个画布和 MCP 协议，我们顺便启动一个 WebSocket 服务器，给我们的前端做实时通讯

### 无聊的代码部分🥱

#### 处理 MCP 服务端

```sh
$ cd packages/mcp-server
$ bun add @modelcontextprotocol/sdk
$ bun add zod@^3
$ bun add canvas  # 这个用于生成像素画的预览
```

:::warning
你可能注意到这里使用了 Zod 3 而非最新版本的 Zod 4，截至 @modelcontextprotocol/sdk，`inputSchema` 仍然使用 Zod 3，我们需要使用匹配的版本，或者干脆不要安装 Zod 依赖而直接使用来自 @modelcontextprotocol/sdk 的 Zod 版本
:::

一个粗糙的画布实现

:::expander packages/mcp-server/canvasDb.ts

```ts
import { Canvas } from 'canvas'

export class CanvasDb {
  private _canvas
  private _fieldSize
  constructor(fieldSize: number) {
    this._fieldSize = fieldSize
    this._canvas = Array.from({ length: fieldSize * fieldSize }, () => '#FFFFFF')
  }

  public clear() {
    this._canvas.fill('#FFFFFF')
  }

  public setPixel(location: [number, number], color: string): void {
    this._canvas[location[0] * this._fieldSize + location[1]] = color
  }

  public setBatchPixels(pixels: [number, number][], color: string): void {
    pixels.forEach((location) => {
      this.setPixel(location, color)
    })
  }

  public getPixel(location: [number, number]): string {
    return this._canvas[location[0] * this._fieldSize + location[1]]!
  }

  public getCanvasData(): string[][] {
    const result: string[][] = []
    for (let i = 0; i < this._fieldSize; i++) {
      const row: string[] = []
      for (let j = 0; j < this._fieldSize; j++) {
        row.push(this.getPixel([i, j]))
      }
      result.push(row)
    }
    return result
  }

  // 我们用 4x 的尺寸来生成预览图，你也不想看只有一点点大的图片吧👿
  public generateImage(): Buffer {
    const canvas = new Canvas(this._fieldSize * 4, this._fieldSize * 4, 'image')
    const ctx = canvas.getContext('2d')
    for (let i = 0; i < this._fieldSize; i++) {
      for (let j = 0; j < this._fieldSize; j++) {
        const color = this.getPixel([i, j])
        ctx.fillStyle = color
        ctx.fillRect(j * 4, i * 4, 4, 4)
      }
    }
    return canvas.toBuffer()
  }
}
```

:::

然后是 MCP 和 WebSocket 部分

:::expander packages/mcp-server/index.ts

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import z from 'zod'
import { CanvasDb } from './canvasDb'

const FIELD_SIZE = 32
const canvas = new CanvasDb(FIELD_SIZE)

const previewClients: Bun.ServerWebSocket<unknown>[] = []
const previewServer = Bun.serve({
  routes: {
    '/ws': (req, server) => {
      if (server.upgrade(req)) {
        return
      }
      return new Response('Upgrade failed', { status: 500 })
    },
  },
  websocket: {
    message: () => {},
    open: (ws) => {
      previewClients.push(ws)
      ws.send(JSON.stringify(canvas.getCanvasData()))
    },
    close: (ws) => {
      previewClients.splice(previewClients.indexOf(ws), 1)
    },
  },
})

const mcpServer = new McpServer({
  name: `Pixel Art Playground`,
  version: '1.0.0',
})

mcpServer.registerTool(
  'get-canvas-size',
  {
    title: 'Get Canvas Size',
    description: 'Get the current canvas size',
    inputSchema: {},
  },
  () => {
    return {
      content: [
        {
          type: 'text',
          text: `Canvas size is ${FIELD_SIZE}x${FIELD_SIZE}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'set-single-pixel',
  {
    title: 'Set Single Pixel',
    description: 'Set a single pixel to a specific color',
    inputSchema: {
      location: z
        .tuple([
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
        ])
        .describe('The location of the pixel to set (row, column)'),
      color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .describe('The color to set the pixel to, in hex format (e.g. #FF0000 for red)'),
    },
  },
  ({ location, color }) => {
    canvas.setPixel(location, color)
    return {
      content: [
        {
          type: 'text',
          text: `Set pixel at (${location[0]}, ${location[1]}) to ${color}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'set-batch-pixel',
  {
    title: 'Set Batch Pixel',
    description: 'Set multiple pixels to a specific color',
    inputSchema: {
      pixels: z
        .array(
          z.tuple([
            z
              .number()
              .min(0)
              .max(FIELD_SIZE - 1),
            z
              .number()
              .min(0)
              .max(FIELD_SIZE - 1),
          ]),
        )
        .describe('An array of locations of the pixels to set (row, column)'),
      color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .describe('The color to set the pixels to, in hex format (e.g. #FF0000 for red)'),
    },
  },
  ({ pixels, color }) => {
    canvas.setBatchPixels(pixels, color)
    return {
      content: [
        {
          type: 'text',
          text: `Set ${pixels.length} pixels to ${color}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'fill-rect',
  {
    title: 'Fill Rectangle',
    description: 'Fill a rectangle area with given color',
    inputSchema: {
      topLeft: z
        .tuple([
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
        ])
        .describe('Top-left corner of the rectangle (row, column)'),
      bottomRight: z
        .tuple([
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
        ])
        .describe('Bottom-right corner of the rectangle (row, column)'),
      color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .describe('The color to fill the rectangle with, in hex format (e.g. #FF0000 for red)'),
    },
  },
  ({ topLeft, bottomRight, color }) => {
    if (topLeft[0] > bottomRight[0] || topLeft[1] > bottomRight[1]) {
      throw new Error('Invalid rectangle coordinates')
    }
    const pixels = []
    for (let y = topLeft[0]; y <= bottomRight[0]; y++) {
      for (let x = topLeft[1]; x <= bottomRight[1]; x++) {
        pixels.push([y, x] as [number, number])
      }
    }
    canvas.setBatchPixels(pixels, color)
    return {
      content: [
        {
          type: 'text',
          text: `Filled rectangle from (${topLeft[0]}, ${topLeft[1]}) to (${bottomRight[0]}, ${bottomRight[1]}) with ${color}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'get-image',
  {
    title: 'Get Image',
    description: 'Generate current image, pixels have been scaled up by 4x',
  },
  async () => {
    return {
      content: [
        {
          type: 'image',
          data: Buffer.from(canvas.generateImage()).toBase64(),
          mimeType: 'image/png',
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'clear-canvas',
  {
    title: 'Clear Canvas',
    description: 'Clear the entire canvas',
  },
  () => {
    canvas.clear()
    return {
      content: [
        {
          type: 'text',
          text: `Cleared the canvas`,
        },
      ],
    }
  },
)

const transport = new StdioServerTransport()
mcpServer.connect(transport)

process.on('SIGINT', async () => {
  await Promise.allSettled([mcpServer.close(), previewServer.stop(true)])
})
```

:::

:::info 稍作解释

- 这里大量使用了 mcpServer.registerTool()，这个方法用于注册工具，并且会把 inputSchema 转换为 JSON Schema，从而让 LLM 能够理解如何调用这个工具。z.describe() 方法用于为每个字段提供更详细的描述信息。
- `const transport = new StdioServerTransport(); mcpServer.connect(transport)` 会创建一个基于标准输入输出的传输通道，并将 MCP 服务器连接到这个通道上。这样，MCP 服务器就可以通过标准输入输出与外部系统进行通信（虽然名为 MCP 服务器，但是我们的使用方法并不需要依赖于网络请求）。
- 关于 Bun.serve() 和它如何处理 WebSocket 连接，可以参考 [Bun 的文档](https://bun.sh/docs/api/websockets)。我们的实现非常原始，每次更新都会发送完整的画布数据，并且忽略了所有来自 WebSocket 客户端的消息，但是这对本项目而言已经足够。

:::

#### 处理预览客户端

:::expander packages/preview-client/src/App.vue

```vue
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const ws = new WebSocket('ws://' + window.location.host + '/ws')
const canvasData = ref<string[][]>([[]])

ws.onmessage = (event) => {
  canvasData.value = JSON.parse(event.data)
}

onUnmounted(() => {
  ws.close()
})
</script>

<template>
  <div
    v-for="row in canvasData"
    :style="{
      display: 'flex',
      flexDirection: 'row',
    }">
    <div
      v-for="cell in row"
      :style="{
        background: cell,
        width: '20px',
        height: '20px',
      }"></div>
  </div>
</template>
```

:::

:::expander packages/preview-client/vite.config.ts

<!-- prettier-ignore-start -->

```ts
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { // [!code ++]
    proxy: { // [!code ++]
      '/ws': { // [!code ++]
        target: 'ws://localhost:3000', // [!code ++]
        changeOrigin: true, // [!code ++]
        ws: true, // [!code ++]
      }, // [!code ++]
    }, // [!code ++]
  }, // [!code ++]
})
```
<!-- prettier-ignore-end -->

:::

:::info 稍作解释

- `Bun.serve()` 默认启动在 `localhost:3000`。
- `server.proxy` 将 `/ws` 代理到 `localhost:3000/ws`，同时更改 origin，这使得我们无需处理烦人的 CORS 问题。当然，你也可以修改 Bun.serve() 的代码添加 CORS 头部。
- 这里可以解释为什么我们还需要 Node.js 了：截至 Bun 1.2.20，[这个 issue](https://github.com/oven-sh/bun/issues/10441) 仍然处于 Open 状态，如果我们使用 `bunx --bun vite` 启动预览客户端，`server.proxy` 无法正常工作，你将会看到 `[vite] ws proxy error: undefined`。

:::

#### 用上它

如果你也在用 Cline：

:::expander Cline → Configure MCP Servers

```json
{
  "mcpServers": {
    "pixel-art-canvas": {
      "command": "bun",
      "args": ["/PATH/TO/pix-llm/packages/mcp-server/index.ts"]
    }
  }
}
```

:::

或者使用 Copilot：

:::expander Copilot → 配置工具 → MCP 服务器 → 命令(stdio)

```sh
bun /PATH/TO/pix-llm/packages/mcp-server/index.ts
```

:::

然后启动预览

```sh
$ cd packages/preview-client
$ bun dev
```

如果你恰好只打开了一个 VSCode 窗口，那么恭喜你，你已经可以使用这个小玩具了！

### Houston, We’ve Had a Problem

事实上，如果你同时打开了两个 VSCode 窗口，或者同时使用了 Cline 和 Copilot，或者各种差不多的情况，你很有可能遇到一个小问题：

```plaintext
error: Failed to start server. Is port 3000 in use? syscall: "listen", errno: 0, code: "EADDRINUSE" at [REDACTED]/pix-llm/packages/mcp-server/index.ts:10:27 at loadAndEvaluateModule (2:1)
```

除非特殊配置，我们在 MCP 服务器里使用的 `Bun.serve()` 将始终尝试使用 3000 端口。很不幸的，我们没法控制各种 agent tool 只启动一次我们的程序，所以我们要进行**亿些小修改**

此处采用的修改方法：

- 将 WebSocket 和画板数据移至单独的服务器管理
- MCP 服务器将作为客户端连接这个服务器，推送接受的大模型工具调用
- 预览客户端不直接连接 MCP 服务器，而是连接这个新的服务器

### 继续🥱

类似建立 mcp-server 的过程，建立一个 db-server

把 `packages/mcp-server/canvasDb.ts` 移动到 `packages/db-server/canvasDb.ts`

处理 db-server

:::expander packages/db-server/index.ts

```ts
import { CanvasDb } from './canvasDb'

export const FIELD_SIZE = 32

const previewClients: Bun.ServerWebSocket<unknown>[] = []

const canvas = new CanvasDb(FIELD_SIZE)

Bun.serve({
  routes: {
    '/update': async (req) => {
      const { location, color } = (await req.body!.json()) as {
        location: [number, number][]
        color: string
      }
      canvas.setBatchPixels(location, color)
      previewClients.forEach((client) => {
        client.send(JSON.stringify(canvas.getCanvasData()))
      })
      return new Response('OK')
    },
    '/clear': () => {
      canvas.clear()
      previewClients.forEach((client) => {
        client.send(JSON.stringify(canvas.getCanvasData()))
      })
      return new Response('OK')
    },
    '/field-size': () => {
      return new Response(FIELD_SIZE.toString())
    },
    '/': () => {
      return new Response(canvas.generateImage(), {
        headers: {
          // 在这里添加 Content-Type 头部
          // 我们就可以直接访问 http://localhost:3000/ 预览图片
          // 否则浏览器会直接下载而不是展示这个图片
          'Content-Type': 'image/png',
        },
      })
    },
    '/ws': (req, server) => {
      if (server.upgrade(req)) {
        return
      }
      return new Response('Upgrade failed', { status: 500 })
    },
  },
  websocket: {
    message: () => {},
    open: (ws) => {
      previewClients.push(ws)
      ws.send(JSON.stringify(canvas.getCanvasData()))
    },
    close: (ws) => {
      previewClients.splice(previewClients.indexOf(ws), 1)
    },
  },
})

console.log('Server started on http://localhost:3000')
```

:::

修改 mcp-server

:::expander packages/mcp-server/index.ts

<!-- prettier-ignore-start -->
```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import z from 'zod'
import { CanvasDb } from './canvasDb'

const FIELD_SIZE = 32 // [!code --]
const canvas = new CanvasDb(FIELD_SIZE) // [!code --]
const dbServer = 'http://localhost:3000' // [!code ++]
const FIELD_SIZE = (await (await fetch(`${dbServer}/field-size`)).json()) as number // [!code ++]

const previewClients: Bun.ServerWebSocket<unknown>[] = [] // [!code --]
const previewServer = Bun.serve({ // [!code --]
  routes: { // [!code --]
    '/ws': (req, server) => { // [!code --]
      if (server.upgrade(req)) { // [!code --]
        return // [!code --]
      } // [!code --]
      return new Response('Upgrade failed', { status: 500 }) // [!code --]
    }, // [!code --]
  }, // [!code --]
  websocket: { // [!code --]
    message: () => {}, // [!code --]
    open: (ws) => { // [!code --]
      previewClients.push(ws) // [!code --]
      ws.send(JSON.stringify(canvas.getCanvasData())) // [!code --]
    }, // [!code --]
    close: (ws) => { // [!code --]
      previewClients.splice(previewClients.indexOf(ws), 1) // [!code --]
    }, // [!code --]
  }, // [!code --]
}) // [!code --]

const mcpServer = new McpServer({
  name: `Pixel Art Playground`,
  version: '1.0.0',
})

mcpServer.registerTool(
  'get-canvas-size',
  {
    title: 'Get Canvas Size',
    description: 'Get the current canvas size',
    inputSchema: {},
  },
  () => {
    return {
      content: [
        {
          type: 'text',
          text: `Canvas size is ${FIELD_SIZE}x${FIELD_SIZE}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'set-single-pixel',
  {
    title: 'Set Single Pixel',
    description: 'Set a single pixel to a specific color',
    inputSchema: {
      location: z
        .tuple([
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
        ])
        .describe('The location of the pixel to set (row, column)'),
      color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .describe('The color to set the pixel to, in hex format (e.g. #FF0000 for red)'),
    },
  },
  ({ location, color }) => {
    canvas.setPixel(location, color) // [!code --]
    fetch(`${dbServer}/update`, { // [!code ++]
      method: 'POST', // [!code ++]
      headers: { // [!code ++]
        'Content-Type': 'application/json', // [!code ++]
      }, // [!code ++]
      body: JSON.stringify({ // [!code ++]
        location: [location], // [!code ++]
        color, // [!code ++]
      }), // [!code ++]
    }) // [!code ++]
    return {
      content: [
        {
          type: 'text',
          text: `Set pixel at (${location[0]}, ${location[1]}) to ${color}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'set-batch-pixel',
  {
    title: 'Set Batch Pixel',
    description: 'Set multiple pixels to a specific color',
    inputSchema: {
      pixels: z
        .array(
          z.tuple([
            z
              .number()
              .min(0)
              .max(FIELD_SIZE - 1),
            z
              .number()
              .min(0)
              .max(FIELD_SIZE - 1),
          ]),
        )
        .describe('An array of locations of the pixels to set (row, column)'),
      color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .describe('The color to set the pixels to, in hex format (e.g. #FF0000 for red)'),
    },
  },
  ({ pixels, color }) => {
    canvas.setBatchPixels(pixels, color) // [!code --]
    fetch(`${dbServer}/update`, { // [!code ++]
      method: 'POST', // [!code ++]
      headers: { // [!code ++]
        'Content-Type': 'application/json', // [!code ++]
      }, // [!code ++]
      body: JSON.stringify({ // [!code ++]
        location: pixels, // [!code ++]
        color, // [!code ++]
      }), // [!code ++]
    }) // [!code ++]
    return {
      content: [
        {
          type: 'text',
          text: `Set ${pixels.length} pixels to ${color}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'fill-rect',
  {
    title: 'Fill Rectangle',
    description: 'Fill a rectangle area with given color',
    inputSchema: {
      topLeft: z
        .tuple([
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
        ])
        .describe('Top-left corner of the rectangle (row, column)'),
      bottomRight: z
        .tuple([
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
          z
            .number()
            .min(0)
            .max(FIELD_SIZE - 1),
        ])
        .describe('Bottom-right corner of the rectangle (row, column)'),
      color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .describe('The color to fill the rectangle with, in hex format (e.g. #FF0000 for red)'),
    },
  },
  ({ topLeft, bottomRight, color }) => {
    if (topLeft[0] > bottomRight[0] || topLeft[1] > bottomRight[1]) {
      throw new Error('Invalid rectangle coordinates')
    }
    const pixels = []
    for (let y = topLeft[0]; y <= bottomRight[0]; y++) {
      for (let x = topLeft[1]; x <= bottomRight[1]; x++) {
        pixels.push([y, x] as [number, number])
      }
    }
    canvas.setBatchPixels(pixels, color) // [!code --]
    fetch(`${dbServer}/update`, { // [!code ++]
      method: 'POST', // [!code ++]
      headers: { // [!code ++]
        'Content-Type': 'application/json', // [!code ++]
      }, // [!code ++]
      body: JSON.stringify({ // [!code ++]
        location: pixels, // [!code ++]
        color, // [!code ++]
      }), // [!code ++]
    }) // [!code ++]
    return {
      content: [
        {
          type: 'text',
          text: `Filled rectangle from (${topLeft[0]}, ${topLeft[1]}) to (${bottomRight[0]}, ${bottomRight[1]}) with ${color}`,
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'get-image',
  {
    title: 'Get Image',
    description: 'Generate current image, pixels have been scaled up by 4x',
  },
  async () => {
    return {
      content: [
        {
          type: 'image',
          data: Buffer.from(canvas.generateImage()).toBase64(), // [!code --]
          data: Buffer.from(await (await fetch(dbServer)).arrayBuffer()).toBase64(), // [!code ++]
          mimeType: 'image/png',
        },
      ],
    }
  },
)

mcpServer.registerTool(
  'clear-canvas',
  {
    title: 'Clear Canvas',
    description: 'Clear the entire canvas',
  },
  () => {
    canvas.clear() // [!code --]
    fetch(`${dbServer}/clear`, { // [!code ++]
      method: 'POST', // [!code ++]
      headers: { // [!code ++]
        'Content-Type': 'application/json', // [!code ++]
      }, // [!code ++]
    }) // [!code ++]
    return {
      content: [
        {
          type: 'text',
          text: `Cleared the canvas`,
        },
      ],
    }
  },
)

const transport = new StdioServerTransport()
mcpServer.connect(transport)

process.on('SIGINT', async () => {
  await Promise.allSettled([mcpServer.close(), previewServer.stop(true)])
  await mcpServer.close()
})
```
<!-- prettier-ignore-end -->

:::

:::info
其实我们有一万种方法实现这个中间商服务器，光是我知道的能保证类型安全的就有

- [Elysia](https://elysiajs.com/)
- [Hono](https://hono.dev/)
- [tRPC](https://trpc.io/)

不过呢，这里直接使用最原始的 `Bun.serve()` 与 `fetch()` 已经完全够用

:::

## 看看效果

启动这个中间商服务器

```sh
$ cd packages/db-server
$ bun index.ts
Server started on http://localhost:3000
```

打开预览前端

```sh
$ cd packages/preview-client
$ bun dev
# 然后戳一下给出的网址
```

最后给大模型喂一段 prompt

```plaintext
create a pixel art with the tool you have, as complex as possible, then describe it for me
```

坐等结果

- deepseek-v3-250324
  - ![deepseek](./demos/dpsk.png)
  - > Created a complex 32x32 pixel art featuring:
    >
    > 1. Central diamond structure in orange-red with nested smaller diamonds
    > 2. Four concentric square borders in alternating blue and green
    > 3. Radiating diagonal lines in purple creating star-like patterns
    > 4. Symmetrical geometric designs in all four quadrants
    > 5. Color gradients achieved through strategic pixel placement
    > 6. Multiple layers of visual complexity with overlapping shapes
    >    The artwork combines precise symmetry with vibrant color contrasts to create an intricate, eye-catching composition.
- doubao-seed-1.6-250615
  - ![doubao](./demos/doubao.png)
  - > Created a 32x32 pixel art landscape featuring multiple elements:
    >
    > - A yellow sun (#FFFF00) in the top-left quadrant with radiating edges
    > - Light blue sky (#87CEEB) covering the upper portion of the canvas
    > - Two white clouds (#FFFFFF) floating in the sky
    > - A green bush/tree (#008000) with darker green details (#006400) in the mid-left area
    > - A red house (#FF0000) with a blue window (#0000FF) and black door (#000000) in the center
    > - A gray mountain range (#808080) on the right side
    > - A brown tree trunk (#8B4513) with white cloud-like foliage in the lower-left area
    >
    > The composition balances natural elements (sky, clouds, mountain, tree) with a man-made structure (house), creating a cohesive outdoor scene.

## 结语

这只是一个及其粗糙的 MCP 实现，我们还有很多可以改进的地方

- 同时处理来自多个大模型的请求
- 提供更丰富的图像操作工具
- 响应式地更改画布大小（现在还只能改代码然后重新加载 MCP 服务器实现这个功能）
- ...

SDK 中还有例如 `registerPrompt()` `registerResource()` 这样的方法完全没有使用

但是无论如何，这都是一个非常有趣的小玩具，读者也可尝试扩充这个小玩具的各种功能

完整代码见 [GitHub 仓库](https://github.com/illusionaryd/pix-mcp)，完成这篇文章时对本仓库的代码进行了小范围的修改，因此并不完全一致

[^1]: [Introduction - Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)

~~我测我博客排版怎么又炸了，修一下~~
