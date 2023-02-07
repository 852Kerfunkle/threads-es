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
import { TransferObjectWithArrayApiType } from "./threads/transfer-object-with-array.worker";

describe("Worker tests", () => {
    it("Basic", async () => {
        const thread = await EsThread.Spawn<HelloWorldApiType>(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

        await thread.terminate();
    });

    it("Throws", async () => {
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

    it("Throws before exposeApi", async () => {
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

    it("Rejects before exposeApi", async () => {
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

    it("Unhandled rejection", async () => {
        const thread = await EsThread.Spawn<RejectApiType>(
            new Worker(new URL("threads/reject.worker.ts", import.meta.url),
            {type: "module"}));
        await delay(500);

        // "Error: it had to happen eventually"
        // NOTE: currently there is no way to deal with unhandled rejections.
        // Maybe need some event for it.
        thread.terminate();
    });

    it("Posts invalid results", async () => {
        const thread = await EsThread.Spawn<PostWeirdResultApiType>(
            new Worker(new URL("threads/post-weird-result.worker.ts", import.meta.url),
            {type: "module"}));
        
        // "Error: it had to happen eventually"
        // NOTE: currently there is no way to deal with these errors.
        // Maybe need some event for it.
        await thread.methods.postWeird();

        thread.terminate();
    });

    it("With transfer", async () => {
        const thread = await EsThread.Spawn<TransferArrayApiType>(
            new Worker(new URL("threads/transfer-array.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.transferArray).to.not.be.undefined;

        const arrayIn = new Uint8Array(10);
        arrayIn.forEach((value, index) => { arrayIn[index] = index });

        const arrayOut = await thread.methods.transferArray(Transfer(arrayIn.buffer));

        expect(arrayOut.byteLength).to.be.eq(10);
        expect(new Uint8Array(arrayOut)).to.be.eql(new Uint8Array([0,3,6,9,12,15,18,21,24,27]));

        await thread.terminate();
    });

    it("With complex transfer", async () => {
        const thread = await EsThread.Spawn<TransferObjectWithArrayApiType>(
            new Worker(new URL("threads/transfer-object-with-array.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.transferObjectWithArray).to.not.be.undefined;

        const arrayIn = new Uint8Array(10);
        arrayIn.forEach((value, index) => { arrayIn[index] = index });
        const objectIn = {array: arrayIn.buffer}

        const objectOut = await thread.methods.transferObjectWithArray(Transfer(objectIn, [objectIn.array]));

        expect(objectOut.array.byteLength).to.be.eq(10);
        expect(new Uint8Array(objectOut.array)).to.be.eql(new Uint8Array([0,2,4,6,8,10,12,14,16,18]));

        await thread.terminate();
    });

    it("Async api", async () => {
        const thread = await EsThread.Spawn<AsyncHelloWorldApiType>(
            new Worker(new URL("threads/async-api.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

        await thread.terminate();
    });

    it("Subworkers", async () => {
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

    it("Long-running", async () => {
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
});