# threads-es
## A modern, zero-dependency WebWorker abstraction.

[![npm](https://img.shields.io/npm/v/threads-es?logo=npm)](https://npmjs.com/package/threads-es)
![GitHub license](https://img.shields.io/github/license/852Kerfunkle/threads-es?logo=github)
![Node.js tests](https://github.com/852Kerfunkle/threads-es/actions/workflows/node.js.yml/badge.svg)
[![GitHub top language](https://img.shields.io/github/languages/top/852Kerfunkle/threads-es?logo=typescript)](https://typescriptlang.org)

Supports `Worker`, `SharedWorker`.

It's made for the web, it doesn't support Node.js workers. Use with bundlers that support bundling workers with `import.meta`, i.e. Rollup or Webpack 5.

### Examples

hello-world.worker.ts
```ts
import { exposeApi } from "threads-es/worker"

const helloWorldApi = {
    helloWorld: () => {
        return "Hello World!";
    }
}

export type HelloWorldApiType = typeof helloWorldApi;

exposeApi(helloWorldApi);
```

controller.ts
```ts
import { EsThread } from "threads-es/controller"
import { HelloWorldApiType } from "./hello-world.worker.ts"

const thread = await EsThread.Spawn<HelloWorldApiType>(
    new Worker(new URL("hello-world.worker.ts", import.meta.url),
    {type: "module"}));

// "Hello World!"
console.log(await thread.methods.helloWorld());

await thread.terminate();
```

pool.ts
```ts
import { EsThreadPool, EsThread } from "threads-es/controller"
import { HelloWorldApiType } from "./hello-world.worker.ts"

const pool = await EsThreadPool.Spawn<HelloWorldApiType>(() => EsThread.Spawn(
    new Worker(new URL("hello-world.worker.ts", import.meta.url),
    {type: "module"}), {size: 4});

// "Hello World!"
console.log(await pool.queue(thread => thread.methods.helloWorld()));

await pool.terminate();
```

Inspired by [threads.js](https://github.com/andywer/threads.js).