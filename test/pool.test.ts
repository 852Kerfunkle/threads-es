import { expect } from "@esm-bundle/chai"
import { EsThread, EsThreadPool } from "../src/controller";
import { HelloWorldApiType } from "./threads/hello-world.worker"
import { LongRunningApiType } from "./threads/long-running.worker";

describe("EsThreadPool tests", () => {
    it("Default pool options", async () => {
        const pool = await EsThreadPool.Spawn<HelloWorldApiType>(() => EsThread.Spawn(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"})));

        expect(pool.options.size).to.be.eq(navigator.hardwareConcurrency);
        expect(pool.options.name).to.be.eq("EsThreadPool");

        await pool.terminate();
    });

    it("One worker", async () => {
        const pool = await EsThreadPool.Spawn<HelloWorldApiType>(() => EsThread.Spawn(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"})), {size: 1});

        expect(await pool.queue(worker => worker.methods.helloWorld())).to.be.eq("Hello World!");

        await pool.terminate();
    });

    it("Multiple workers", async () => {
        const pool = await EsThreadPool.Spawn<LongRunningApiType>(() => EsThread.Spawn(
            new Worker(new URL("threads/long-running.worker.ts", import.meta.url),
            {type: "module"})), {size: 2});

        const result0 = pool.queue(worker => worker.methods.takesTime(250));
        const result1 = pool.queue(worker => worker.methods.takesTime(250));
        
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(1);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(1);
        await pool.settled();
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(0);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(0);
        expect(await result0).to.be.eq("Hello World!");
        expect(await result1).to.be.eq("Hello World!");

        await pool.terminate();
    });

    it("Many workers and many tasks", async () => {
        const pool = await EsThreadPool.Spawn<HelloWorldApiType>(() => EsThread.Spawn(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"})), {size: 8});

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