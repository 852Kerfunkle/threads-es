import { expect, assert } from "@esm-bundle/chai"
import { EsThread } from "../src/controller";
import { Transfer } from "../src/shared";
import { delay } from "../src/shared/Utils";
import { HelloWorldApiType } from "./threads/hello-world.worker"
import { TransferArrayApiType } from "./threads/transfer-array.worker";
import { AsyncHelloWorldApiType } from "./threads/async-api.worker";
import { ThrowHelloWorldApiType } from "./threads/throw.worker";
import { LongRunningApiType } from "./threads/long-running.worker";
import { RejectApiType } from "./threads/reject.worker";
import { TransferObjectWithArrayApiType } from "./threads/transfer-object-with-array.worker";
import { TestWorkerApiType } from "./threads/test-worker-api.worker";
import { TransferReadableStreamApiType } from "./threads/transfer-readable-stream.worker";
import { ExposeApiNotCalledApiType } from "./threads/exposeApi-not-called";

type TestWorkerType = new (scriptURL: string | URL, options?: WorkerOptions) => (Worker | SharedWorker);

export function genericWorkerTests(WorkerType: TestWorkerType) {
    describe(`Generic ${WorkerType.name} tests`, () => {
        it("Basic", async () => {
            const thread = await EsThread.Spawn<HelloWorldApiType>(
                new WorkerType(new URL("threads/hello-world.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.helloWorld).to.not.be.undefined;

            expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

            await thread.terminate();
        });

        it("exposeApi not called", async () => {
            try {
                await EsThread.Spawn<ExposeApiNotCalledApiType>(
                    new WorkerType(new URL("threads/exposeApi-not-called.ts", import.meta.url),
                    {type: "module"}), {timeout: 250});
                assert(false, "Spawn should not have succeeded");
            }
            catch(e) {
                assert(e instanceof Error, "Exception isn't of 'Error' type");
                expect(e.message).to.contain("Did not receive an init message from worker");
            }
        });

        it("Throws", async () => {
            const thread = await EsThread.Spawn<ThrowHelloWorldApiType>(
                new WorkerType(new URL("threads/throw.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.helloWorld).to.not.be.undefined;

            try {
                await thread.methods.helloWorld();
                assert(false, "No error was thrown");
            }
            catch(e) {
                assert(e instanceof Error, "Exception isn't of 'Error' type");
                expect(e.message).to.be.eq("Hello Error!");
            }

            await thread.terminate();
        });

        it("Unhandled rejection", async () => {
            const thread = await EsThread.Spawn<RejectApiType>(
                new WorkerType(new URL("threads/reject.worker.ts", import.meta.url),
                {type: "module"}));
            await delay(500);

            // "Error: it had to happen eventually"
            // NOTE: currently there is no way to deal with unhandled rejections.
            // Maybe need some event for it.
            thread.terminate();
        });

        it("With transfer", async () => {
            const thread = await EsThread.Spawn<TransferArrayApiType>(
                new WorkerType(new URL("threads/transfer-array.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.transferArray).to.not.be.undefined;

            const arrayIn = new Uint8Array(10);
            arrayIn.forEach((value, index) => { arrayIn[index] = index });

            const arrayOut = await thread.methods.transferArray(3, Transfer(arrayIn.buffer));

            expect(arrayOut.byteLength).to.be.eq(10);
            expect(new Uint8Array(arrayOut)).to.be.eql(new Uint8Array([0,3,6,9,12,15,18,21,24,27]));

            await thread.terminate();
        });

        it("With complex transfer", async () => {
            const thread = await EsThread.Spawn<TransferObjectWithArrayApiType>(
                new WorkerType(new URL("threads/transfer-object-with-array.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.transferObjectWithArray).to.not.be.undefined;

            const arrayIn = new Uint8Array(10);
            arrayIn.forEach((value, index) => { arrayIn[index] = index });
            const objectIn = {array: arrayIn.buffer}

            const objectOut = await thread.methods.transferObjectWithArray(Transfer(objectIn, [objectIn.array]), 2);

            expect(objectOut.array.byteLength).to.be.eq(10);
            expect(new Uint8Array(objectOut.array)).to.be.eql(new Uint8Array([0,2,4,6,8,10,12,14,16,18]));

            await thread.terminate();
        });

        it("Transfer stream", async () => {
            const thread = await EsThread.Spawn<TransferReadableStreamApiType>(
                new WorkerType(new URL("threads/transfer-readable-stream.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.transferReadableStream).to.not.be.undefined;

            const rs = new ReadableStream<string>({
                start(controller) {
                    controller.enqueue('Hello');
                    controller.enqueue('World!');
                    controller.close();
                }
            });

            // Will only resolve once the sink is closed.
            await thread.methods.transferReadableStream(Transfer(rs));

            await thread.terminate();
        });

        it("Async api", async () => {
            const thread = await EsThread.Spawn<AsyncHelloWorldApiType>(
                new WorkerType(new URL("threads/async-api.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.helloWorld).to.not.be.undefined;

            expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

            await thread.terminate();
        });

        it("Long-running", async () => {
            const thread = await EsThread.Spawn<LongRunningApiType>(
                new WorkerType(new URL("threads/long-running.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.takesTime).to.not.be.undefined;

            const result = thread.methods.takesTime(250);
            expect(thread.numQueuedTasks).to.be.eq(1);
            await thread.settled();
            expect(thread.numQueuedTasks).to.be.eq(0);

            expect(await result).to.be.eq("Hello World!");

            await thread.terminate();
        });

        it("Test worker Api", async () => {
            const thread = await EsThread.Spawn<TestWorkerApiType>(
                new WorkerType(new URL("threads/test-worker-api.worker.ts", import.meta.url),
                {type: "module"}));
    
            expect(thread).to.not.be.undefined;
            expect(thread.methods.testWorkerApi).to.not.be.undefined;
    
            try {
                await thread.methods.testWorkerApi(WorkerType.name as "Worker" | "SharedWorker");
            }
            catch(e) {
                assert(e instanceof Error, "Exception isn't of 'Error' type");
                assert(false, e.message);
            }
    
            await thread.terminate();
        });
    });
}