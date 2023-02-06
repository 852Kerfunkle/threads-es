import { expect } from "@esm-bundle/chai"
import { HelloWorldApiType } from "./threads/hello-world.worker"
import { spawn, EsWorkerPool } from "../controller";

describe("Run some basic pool tests", () => {
    it("Launch a pool", async () => {
        const pool = new EsWorkerPool(() => spawn<HelloWorldApiType>(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"})), {size: 1});
        await pool.spawnThreads();

        expect(await pool.queue(worker => worker.helloWorld())).to.be.eq("Hello World!");

        await pool.terminate();
    });

    it("Launch a pool and queue 20k tasks", async () => {
        const pool = new EsWorkerPool(() => spawn<HelloWorldApiType>(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"})), {size: 8});
        await pool.spawnThreads();

        const results: Promise<string>[] = []

        for(let i = 0; i < 20000; ++i) {
            results.push(pool.queue(worker => worker.helloWorld()));
        }

        for (const res of await Promise.all(results)) {
            expect(res).to.be.eq("Hello World!");
        }

        await pool.terminate();
    }).timeout(4000);
});