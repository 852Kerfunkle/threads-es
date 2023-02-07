# threads-es
## A modern, zero-dependency WebWorker abstraction.

[![NPM](https://img.shields.io/npm/v/threads-es.svg?style=flat)](https://npmjs.org/threads-es/)
![NPM License](https://img.shields.io/npm/l/threads-es)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-blue.svg?style=flat)](https://github.com/852Kerfunkle/threads-es/issues)

Supports `Worker`, `SharedWorker` and quite possibly also `ServiceWorker`.

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