# threads-es
## A modern, zero-dependency WebWorker abstraction.

[![npm](https://img.shields.io/npm/v/threads-es?logo=npm)](https://npmjs.com/package/threads-es)
![GitHub license](https://img.shields.io/github/license/852Kerfunkle/threads-es?logo=github)
[![GitHub top language](https://img.shields.io/github/languages/top/852Kerfunkle/threads-es?logo=typescript)](https://typescriptlang.org)
![Node.js tests](https://img.shields.io/github/actions/workflow/status/852Kerfunkle/threads-es/node.js.yml?label=Node.js%20CI&logo=github)

Supports `Worker`, `SharedWorker`.

It's made for the web, it doesn't support Node.js workers. Use with bundlers that support bundling workers with `import.meta`, i.e. Rollup or Webpack 5.

- Tiny, when minified.
- Promise based.
- Fully typed.
- Well tested.

### Documentation

You can find the (latest) documentation at: https://852kerfunkle.github.io/threads-es/main

### Examples

[More examples](test/threads/valid) in the tests.

#### Threads

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
    new Worker(new URL("./hello-world.worker.ts", import.meta.url),
    {type: "module"}));

// "Hello World!"
console.log(await thread.methods.helloWorld());

await thread.terminate();
```

#### Pools

pool.ts
```ts
import { EsThreadPool, EsThread } from "threads-es/controller"
import { HelloWorldApiType } from "./hello-world.worker.ts"

const pool = await EsThreadPool.Spawn(() => EsThread.Spawn<HelloWorldApiType>(
    new Worker(new URL("./hello-world.worker.ts", import.meta.url),
    {type: "module"}), {size: 4});

// "Hello World!"
console.log(await pool.queue(thread => thread.methods.helloWorld()));

await pool.terminate();
```

#### Transferables

transfer-array.worker.ts
```ts
import { Transfer, TransferDescriptor } from "threads-es/shared";
import { exposeApi } from "threads-es/worker"

const transferArrayApi = {
    transferArray: (array: TransferDescriptor<ArrayBuffer>): TransferDescriptor<ArrayBuffer> => {
        const uint8 = new Uint8Array(array.send);
        // Process the buffer.
        return Transfer(uint8.buffer);
    }
}

export type TransferArrayApiType = typeof transferArrayApi;

exposeApi(transferArrayApi);
```

controller.ts
```ts
import { EsThread } from "threads-es/controller"
import { Transfer } from "threads-es/shared";
import { TransferArrayApiType } from "./transfer-array.worker.ts"

const thread = await EsThread.Spawn<TransferArrayApiType>(
    new Worker(new URL("./transfer-array.worker.ts", import.meta.url),
    {type: "module"}));

const arrayIn = new Uint8Array(10);
arrayIn.forEach((value, index) => { arrayIn[index] = index });

const arrayOut = await thread.methods.transferArray(Transfer(arrayIn.buffer));

// Do something with the result.

await thread.terminate();
```

Inspired by [threads.js](https://github.com/andywer/threads.js).