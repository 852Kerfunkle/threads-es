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
    });
});