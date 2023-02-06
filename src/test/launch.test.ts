import { expect, assert } from "@esm-bundle/chai"
import { HelloWorldApiType } from "./threads/hello-world.worker"
import { TransferArrayApiType } from "./threads/transfer-array.worker";
import { AsyncHelloWorldApiType } from "./threads/async-api.worker";
import { EsThread } from "../controller";
import { Transfer } from "../shared";
import { WithSubworkerApiType } from "./threads/with-subworker.worker";
import { ThrowHelloWorldApiType } from "./threads/throw.worker";

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