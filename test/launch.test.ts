import { expect, assert } from "@esm-bundle/chai"
import { EsThread } from "../src/controller";
import { Transfer } from "../src/shared";
import { delay } from "../src/shared/Utils";
import { HelloWorldApiType } from "./threads/hello-world.worker"
import { TransferArrayApiType } from "./threads/transfer-array.worker";
import { AsyncHelloWorldApiType } from "./threads/async-api.worker";
import { WithSubworkerApiType } from "./threads/with-subworker.worker";
import { ThrowHelloWorldApiType } from "./threads/throw.worker";
import { LongRunningApiType } from "./threads/long-running.worker";
import { ThrowTopApiType } from "./threads/throw-top.worker";
import { RejectTopApiType } from "./threads/reject-top.worker";
import { RejectApiType } from "./threads/reject.worker";
import { PostWeirdResultApiType } from "./threads/post-weird-result.worker";

describe("Run some basic worker tests", () => {
    it("Launch a simple worker", async () => {
        const thread = await EsThread.Spawn<HelloWorldApiType>(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

        await thread.terminate();
    });

    it("Launch a simple worker that throws", async () => {
        const thread = await EsThread.Spawn<ThrowHelloWorldApiType>(
            new Worker(new URL("threads/throw.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        try {
            await thread.methods.helloWorld();
            assert(false);
        }
        catch(e) {
            assert(e.toString() === "Error: Hello World!");
        }

        await thread.terminate();
    });

    it("Launch a simple worker that throws before exposeApi", async () => {
        try {
            await EsThread.Spawn<ThrowTopApiType>(
                new Worker(new URL("threads/throw-top.worker.ts", import.meta.url),
                {type: "module"}));
            assert(false);
        }
        catch(e) {
            expect(e.toString()).to.be.eq("Error: whoops");
        }
    });

    it("Launch a simple worker that rejects before exposeApi", async () => {
        try {
            await EsThread.Spawn<RejectTopApiType>(
                new Worker(new URL("threads/reject-top.worker.ts", import.meta.url),
                {type: "module"}));
            assert(false);
        }
        catch(e) {
            expect(e.toString()).to.be.eq("Error: spoohw");
        }
    });

    it("Launch a simple worker with unhandled rejection", async () => {
        const thread = await EsThread.Spawn<RejectApiType>(
            new Worker(new URL("threads/reject.worker.ts", import.meta.url),
            {type: "module"}));
        await delay(500);

        // "Error: it had to happen eventually"
        // NOTE: currently there is no way to deal with unhandled rejections.
        // Maybe need some event for it.
        thread.terminate();
    });

    it("Launch a simple worker that posts invalid results", async () => {
        const thread = await EsThread.Spawn<PostWeirdResultApiType>(
            new Worker(new URL("threads/post-weird-result.worker.ts", import.meta.url),
            {type: "module"}));
        
        // "Error: it had to happen eventually"
        // NOTE: currently there is no way to deal with these errors.
        // Maybe need some event for it.
        await thread.methods.postWeird();

        thread.terminate();
    });

    it("Launch a worker with transfer", async () => {
        const thread = await EsThread.Spawn<TransferArrayApiType>(
            new Worker(new URL("threads/transfer-array.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.transferArray).to.not.be.undefined;

        const arrayIn = new Uint8Array(10);
        arrayIn.forEach((value, index) => { arrayIn[index] = index });

        const arrayOut = await thread.methods.transferArray(Transfer(arrayIn.buffer));

        expect(arrayOut.byteLength).to.be.eq(10);
        expect(new Uint8Array(arrayOut.byteLength)).to.be.eql(new Uint8Array([0,0,0,0,0,0,0,0,0,0]));

        await thread.terminate();
    });

    it("Launch a worker with async api", async () => {
        const thread = await EsThread.Spawn<AsyncHelloWorldApiType>(
            new Worker(new URL("threads/async-api.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

        await thread.terminate();
    });

    it("Launch a worker with subworker", async () => {
        const thread = await EsThread.Spawn<WithSubworkerApiType>(
            new Worker(new URL("threads/with-subworker.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.init).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;
        expect(thread.methods.shutdown).to.not.be.undefined;

        await thread.methods.init()
        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");
        await thread.methods.shutdown()

        await thread.terminate();
    });

    it("Launch a long-running worker", async () => {
        const thread = await EsThread.Spawn<LongRunningApiType>(
            new Worker(new URL("threads/long-running.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.takesTime).to.not.be.undefined;

        const result = thread.methods.takesTime(250);
        expect(thread.numQueuedJobs).to.be.eq(1);
        await thread.settled();
        expect(thread.numQueuedJobs).to.be.eq(0);

        expect(await result).to.be.eq("Hello World!");

        await thread.terminate();
    });

    it("Launch a shared worker", async () => {
        const thread = await EsThread.Spawn<HelloWorldApiType>(
            new SharedWorker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

        await thread.terminate();
    });

    // Figure out if SharedWorker can have sub-workers...
    // Accoding to this SharedWorkers can't have sub-workers:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=31666
    /*it("Launch a shared worker with subworker", async () => {
        const thread = await EsThread.Spawn<WithSubworkerApiType>(
            new SharedWorker(new URL("threads/with-subworker.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.init).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;
        expect(thread.methods.shutdown).to.not.be.undefined;

        await thread.init()
        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");
        await thread.shutdown()

        await thread.terminate();
    });*/
});