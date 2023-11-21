# threads-es
## A modern, (almost) zero-dependency WebWorker abstraction.

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

Current documentation at: https://852kerfunkle.github.io/threads-es/v1.0.0

Latest documentation at: https://852kerfunkle.github.io/threads-es/main

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

#### Reporting progress from a worker

If you need a worker to report progress you could use a stream. For other options see [#4](https://github.com/852Kerfunkle/threads-es/issues/4).

progress.worker.ts
```ts
import { TransferDescriptor } from 'threads-es/shared';
import { exposeApi } from 'threads-es/worker';

const progressApi = {
    withProgress: async (ags..., progress: TransferDescriptor<WritableStream<number>>) => {
        // Imagine doing some work and updating the progress as it goes along.
        await progress.write(10);
        await progress.write(20);
        await progress.write(100);
        await progress.close();
    }
}

export type ProgressApiType = typeof progressApi;

exposeApi(progressApi);
```

controller.ts
```ts
import { EsThread } from "threads-es/controller"
import { Transfer } from "threads-es/shared"
import { HelloWorldApiType } from "./progress.worker.ts"

const thread = await EsThread.Spawn<ProgressApiType>(
    new Worker(new URL("./progress.worker.ts", import.meta.url),
    {type: "module"}));

const progress = new WritableStream<number>({
    write(p) {
        // You could update the progress in the DOM, or write it to a log, or something like that.
    }
});

await thread.methods.withProgress(args..., Transfer(progress));

await thread.terminate();
```

#### Webpack note

With Webpack or certain test frameworks, you might need the separate your thread api types from the thread code:

api-type.ts
```ts
export type HelloWorldApiType = {
  helloWorld: () => string;
};
```

worker.ts
```ts
import { exposeApi } from 'threads-es/worker';
import { type HelloWorldApiType } from './api-type';

const helloWorldApi: HelloWorldApiType = {
  helloWorld: () => {
    return 'Hello World!';
  },
};

exposeApi(helloWorldApi);
```

controller.ts
```ts
import { EsThread } from "threads-es/controller"
import { HelloWorldApiType } from "./api-type"

const thread = await EsThread.Spawn<HelloWorldApiType>(
    new Worker(new URL("./hello-world.worker.ts", import.meta.url),
    {type: "module"}));

// "Hello World!"
console.log(await thread.methods.helloWorld());

await thread.terminate();
```

Inspired by [threads.js](https://github.com/andywer/threads.js).