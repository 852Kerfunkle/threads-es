import { expect, assert } from "@esm-bundle/chai"
import { EsThread, EsThreadPool } from "../src/controller";
import { CustomTerminateApiType } from "./threads/valid/custom-terminate.worker";
import { HelloWorldApiType } from "./threads/valid/hello-world.worker"
import { LongRunningApiType } from "./threads/valid/long-running.worker";
import { assert as assertUtil } from "../src/shared/Utils";

describe("EsThreadPool tests", () => {
    it("Default pool options", async () => {
        const pool = await EsThreadPool.Spawn<HelloWorldApiType>((threadId) => EsThread.Spawn(
            new Worker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
            {type: "module", name: `HelloWorldWorker #${threadId}`})));

        expect(pool.options.size).to.be.eq(navigator.hardwareConcurrency);
        expect(pool.options.name).to.be.eq("EsThreadPool");

        await pool.terminate();
    });

    it("One worker", async () => {
        const pool = await EsThreadPool.Spawn<HelloWorldApiType>((threadId) => EsThread.Spawn(
            new Worker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
            {type: "module", name: `LongRunningWorker #${threadId}`})), {size: 1});

        expect(await pool.queue(worker => worker.methods.helloWorld())).to.be.eq("Hello World!");

        await pool.terminate();
    });

    it("Multiple workers", async () => {
        const pool = await EsThreadPool.Spawn<LongRunningApiType>((threadId) => EsThread.Spawn(
            new Worker(new URL("threads/valid/long-running.worker.ts", import.meta.url),
            {type: "module", name: `LongRunningWorker #${threadId}`})), {size: 2});

        const result0 = pool.queue(worker => worker.methods.takesTime(50));
        const result1 = pool.queue(worker => worker.methods.takesTime(50));
        
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(1);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(1);
        await pool.settled();
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(0);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(0);
        expect(await result0).to.be.eq("Hello World!");
        expect(await result1).to.be.eq("Hello World!");

        await pool.terminate();
    });

    it("Multiple workers with custom initialise/terminate", async () => {
        const pool = await EsThreadPool.Spawn<CustomTerminateApiType>(async (threadId) => {
                const thread = await EsThread.Spawn<CustomTerminateApiType>(
                    new Worker(new URL("threads/valid/custom-terminate.worker.ts", import.meta.url),
                    {type: "module", name: `LongRunningWorker #${threadId}`}));
                await thread.methods.initialise();
                return thread;
            }, {size: 2});

        const result0 = pool.queue(worker => worker.methods.doWork(50));
        const result1 = pool.queue(worker => worker.methods.doWork(50));
        
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(1);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(1);
        await pool.settled();
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(0);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(0);
        expect(await result0).to.be.eq("Hello World!");
        expect(await result1).to.be.eq("Hello World!");

        await pool.terminate(async (thread) => {
            expect(await thread.methods.terminate()).to.be.eq(42);
        });
    });

    it("Multiple shared workers", async () => {
        // NOTE: shared worker pools will only work correctly if they have unique names.
        const pool = await EsThreadPool.Spawn<LongRunningApiType>((threadId) => EsThread.Spawn(
            new SharedWorker(new URL("threads/valid/long-running.worker.ts", import.meta.url),
            {type: "module", name: `LongRunningWorker #${threadId}`})), {size: 2});

        const result0 = pool.queue(worker => worker.methods.takesTime(50));
        const result1 = pool.queue(worker => worker.methods.takesTime(50));
        
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(1);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(1);
        await pool.resolved();
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(0);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(0);
        expect(await result0).to.be.eq("Hello World!");
        expect(await result1).to.be.eq("Hello World!");

        await pool.terminate(undefined, true);
    });

    it("Many workers and many tasks", async () => {
        const pool = await EsThreadPool.Spawn<HelloWorldApiType>((threadId) => EsThread.Spawn(
            new Worker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
            {type: "module", name: `HelloWorldWorker #${threadId}`})), {size: 8});

        const results: Promise<string>[] = []

        for(let i = 0; i < 20000; ++i) {
            results.push(pool.queue(worker => worker.methods.helloWorld()));
        }

        for (const res of await Promise.all(results)) {
            expect(res).to.be.eq("Hello World!");
        }

        for (const thread of (pool as any).threads) {
            expect(thread.numQueuedTasks).to.be.eq(0);
        }

        await pool.terminate();
    });
});