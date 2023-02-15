import { expect, assert } from "@esm-bundle/chai"
import { EsThread, EsThreadPool } from "../src/controller";
import { CustomTerminateApiType } from "./threads/valid/custom-terminate.worker";
import { HelloWorldApiType } from "./threads/valid/hello-world.worker"
import { LongRunningApiType } from "./threads/valid/long-running.worker";
import { ThrowTopApiType } from "./threads/throw-top.worker";
import { PostWeirdResultApiType } from "./threads/post-weird-result.worker";
import { RandomThrowTopApiType } from "./threads/random-throw-top.worker";

describe("EsThreadPool tests", () => {
    it("Default pool options", async () => {
        const pool = await EsThreadPool.Spawn((threadId) => EsThread.Spawn<HelloWorldApiType>(
            new Worker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
            {type: "module", name: `HelloWorldWorker #${threadId}`})));

        expect(pool.options.size).to.be.eq(navigator.hardwareConcurrency);
        expect(pool.options.name).to.be.eq("EsThreadPool");

        await pool.terminate();
    });

    it("One worker", async () => {
        const pool = await EsThreadPool.Spawn((threadId) => EsThread.Spawn<HelloWorldApiType>(
            new Worker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
            {type: "module", name: `LongRunningWorker #${threadId}`})), {size: 1});

        expect(await pool.queue(worker => worker.methods.helloWorld())).to.be.eq("Hello World!");

        await pool.terminate();
    });

    it("Multiple workers", async () => {
        const pool = await EsThreadPool.Spawn((threadId) => EsThread.Spawn<LongRunningApiType>(
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
        const pool = await EsThreadPool.Spawn(threadId => EsThread.Spawn<CustomTerminateApiType>(
                new Worker(new URL("threads/valid/custom-terminate.worker.ts", import.meta.url),
                {type: "module", name: `LongRunningWorker #${threadId}`})),
            {size: 2},
            async (threadId, thread) => {
                return thread.methods.initialise();
            },
            async (threadId, thread) => {
                expect(await thread.methods.terminate()).to.be.eq(42);
            });

        const result0 = pool.queue(worker => worker.methods.doWork(50));
        const result1 = pool.queue(worker => worker.methods.doWork(50));
        
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(1);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(1);
        await pool.settled();
        expect((pool as any).threads[0].numQueuedTasks).to.be.eq(0);
        expect((pool as any).threads[1].numQueuedTasks).to.be.eq(0);
        expect(await result0).to.be.eq("Hello World!");
        expect(await result1).to.be.eq("Hello World!");

        await pool.terminate();
    });

    it("Multiple shared workers", async () => {
        // NOTE: shared worker pools will only work correctly if they have unique names.
        const pool = await EsThreadPool.Spawn((threadId) => EsThread.Spawn<LongRunningApiType>(
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

        await pool.terminate(true);
    });

    it("Pool fails to spawn threads", async () => {
        try {
            await EsThreadPool.Spawn((threadId) => EsThread.Spawn<ThrowTopApiType>(
                new Worker(new URL("threads/throw-top.worker.ts", import.meta.url),
                {type: "module", name: `HelloWorldWorker #${threadId}`})), {size: 2});
            assert(false, "Unexpectedly succeeded to spawn thread pool");
        }
        catch(e) {
            assert(e instanceof Error, "Error was not of Error type");
            expect(e.message).to.contain("Failed to spawn thread pool. Errors:");
            expect(e.message).to.contain("whoops");
        }
    });

    it("Pool fails to spawn some threads", async () => {
        try {
            await EsThreadPool.Spawn((threadId) => EsThread.Spawn<RandomThrowTopApiType>(
                new Worker(new URL("threads/random-throw-top.worker.ts", import.meta.url),
                {type: "module", name: `HelloWorldWorker #${threadId}`})), {size: 8});
            assert(false, "Unexpectedly succeeded to spawn thread pool");
        }
        catch(e) {
            assert(e instanceof Error, "Error was not of Error type");
            expect(e.message).to.contain("Failed to spawn thread pool. Errors:");
            expect(e.message).to.contain("whoops");
        }
    });

    it("Multiple workers, custom initialise fails", async () => {
        try {
            await EsThreadPool.Spawn(threadId => EsThread.Spawn<HelloWorldApiType>(
                    new Worker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
                    {type: "module", name: `LongRunningWorker #${threadId}`})),
                {size: 2},
                async (threadId) => {
                    if(threadId === 1) throw new Error("oh no...");
                });
            assert(false, "Unexpectedly succeeded to spawn thread pool");
        }
        catch(e) {
            assert(e instanceof Error, "Error was not of Error type");
            expect(e.message).to.contain("Failed to spawn thread pool. Errors:");
            expect(e.message).to.contain("oh no...");
        }
    });

    it("Pool threads post invalid results", async () => {
        const pool = await EsThreadPool.Spawn(() => EsThread.Spawn<PostWeirdResultApiType>(
            new Worker(new URL("threads/post-weird-result.worker.ts", import.meta.url),
            {type: "module"})), {size: 1});

        let errorsRecived = 0;
        const validErrors = [
            "Recieved unexpected WorkerMessage of type: undefined",
            "Recived result for invalid task with UID invalidTaskUID",
            "Recived error for invalid task with UID invalidTaskUID"
        ]
        pool.addEventListener("error", (evt: Event) => {
            errorsRecived++;
            assert(evt instanceof ErrorEvent, "event was not of ErrorEvent type");
            assert(evt.error instanceof Error, "error was not of Error type");
            expect(validErrors).to.include(evt.error.message)
        })

        await pool.queue(thread => thread.methods.postWeird());

        expect(errorsRecived).to.be.eq(3);

        await pool.terminate();
    });

    it("Many workers and many tasks", async () => {
        const pool = await EsThreadPool.Spawn((threadId) => EsThread.Spawn<HelloWorldApiType>(
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
    }).timeout(4000);
});