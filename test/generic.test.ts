import { expect, assert } from "@esm-bundle/chai"
import { EsThread } from "../src/controller";
import { Transfer } from "../src/shared";
import { HelloWorldApiType } from "./threads/valid/hello-world.worker"
import { TransferArrayApiType } from "./threads/valid/transfer-array.worker";
import { AsyncHelloWorldApiType } from "./threads/valid/async-api.worker";
import { ThrowHelloWorldApiType } from "./threads/throw.worker";
import { LongRunningApiType } from "./threads/valid/long-running.worker";
import { TransferObjectWithArrayApiType } from "./threads/valid/transfer-object-with-array.worker";
import { TestWorkerApiType } from "./threads/test-worker-api.worker";
import { TransferStreamsApiType } from "./threads/valid/transfer-streams.worker";
import { ExposeApiNotCalledApiType } from "./threads/exposeApi-not-called.worker";
import { RejectApiType } from "./threads/reject.worker";
import { delay } from "../src/shared/Utils";

type TestWorkerConstructor = new (scriptURL: string | URL, options?: WorkerOptions) => (Worker | SharedWorker);

export function genericWorkerTests(WorkerContructor: TestWorkerConstructor) {
    describe(`Generic ${WorkerContructor.name} tests`, () => {
        it("Basic", async () => {
            const thread = await EsThread.Spawn<HelloWorldApiType>(
                new WorkerContructor(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.helloWorld).to.not.be.undefined;

            expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

            await thread.terminate(true);
        });

        it("exposeApi not called", async () => {
            try {
                await EsThread.Spawn<ExposeApiNotCalledApiType>(
                    new WorkerContructor(new URL("threads/exposeApi-not-called.worker.ts", import.meta.url),
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
                new WorkerContructor(new URL("threads/throw.worker.ts", import.meta.url),
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

            await thread.terminate(true);
        });

        it("Unhandled rejection", async () => {
            const thread = await EsThread.Spawn<RejectApiType>(
                new WorkerContructor(new URL("threads/reject.worker.ts", import.meta.url),
                {type: "module"}));

            let errorsRecived = 0;
            const validErrors = [
                "Uncaught error in worker: it had to happen eventually"
            ];

            thread.addEventListener("error", (evt: Event) => {
                errorsRecived++;
                assert(evt instanceof ErrorEvent, "event was not of ErrorEvent type");
                assert(evt.error instanceof Error, "error was not of Error type");
                expect(validErrors).to.include(evt.error.message)
            });

            await delay(500);

            expect(errorsRecived).to.be.eq(1);

            await thread.terminate(true);
        });

        it("With transfer", async () => {
            const thread = await EsThread.Spawn<TransferArrayApiType>(
                new WorkerContructor(new URL("threads/valid/transfer-array.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.transferArray).to.not.be.undefined;

            const arrayIn = new Uint8Array(10);
            arrayIn.forEach((value, index) => { arrayIn[index] = index });
            expect(arrayIn.byteLength).to.be.eq(10);

            const arrayOut = await thread.methods.transferArray(3, Transfer(arrayIn.buffer));
            // After transfer, the original buffer should have length 0.
            expect(arrayIn.byteLength).to.be.eq(0);

            expect(arrayOut.byteLength).to.be.eq(10);
            expect(new Uint8Array(arrayOut)).to.be.eql(new Uint8Array([0,3,6,9,12,15,18,21,24,27]));

            await thread.terminate(true);
        });

        it("With complex transfer", async () => {
            const thread = await EsThread.Spawn<TransferObjectWithArrayApiType>(
                new WorkerContructor(new URL("threads/valid/transfer-object-with-array.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.transferObjectWithArray).to.not.be.undefined;

            const arrayIn = new Uint8Array(10);
            arrayIn.forEach((value, index) => { arrayIn[index] = index });
            const objectIn = {array: arrayIn.buffer};
            expect(objectIn.array.byteLength).to.be.eq(10);

            const objectOut = await thread.methods.transferObjectWithArray(Transfer(objectIn, [objectIn.array]), 2);
            // After transfer, the original buffer should have length 0.
            expect(objectIn.array.byteLength).to.be.eq(0);

            expect(objectOut.array.byteLength).to.be.eq(10);
            expect(new Uint8Array(objectOut.array)).to.be.eql(new Uint8Array([0,2,4,6,8,10,12,14,16,18]));

            await thread.terminate(true);
        });

        it("Transfer stream", async () => {
            const thread = await EsThread.Spawn<TransferStreamsApiType>(
                new WorkerContructor(new URL("threads/valid/transfer-streams.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.transferStreams).to.not.be.undefined;

            const rs = new ReadableStream<string>({
                start(controller) {
                    controller.enqueue('Hello');
                    controller.enqueue('World!');
                    controller.close();
                }
            });

            const recievedMessages: string[] = [];

            const ws = new WritableStream<string>({
                write(message) {
                    recievedMessages.push(message);
                }
            });

            // Streams not locked before transfer.
            expect(rs.locked).to.be.eq(false);
            expect(ws.locked).to.be.eq(false);

            // Will only resolve once the rs sink is closed.
            const res = thread.methods.transferStreams(Transfer(rs), Transfer(ws));

            // Streams should be locked after transfer.
            expect(rs.locked).to.be.eq(true);
            expect(ws.locked).to.be.eq(true);

            await res;

            expect(recievedMessages).to.be.eql(["World", "Hello!"]);

            await thread.terminate(true);
        });

        it("Async api", async () => {
            const thread = await EsThread.Spawn<AsyncHelloWorldApiType>(
                new WorkerContructor(new URL("threads/valid/async-api.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.helloWorld).to.not.be.undefined;

            expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

            await thread.terminate(true);
        });

        it("Long-running", async () => {
            const thread = await EsThread.Spawn<LongRunningApiType>(
                new WorkerContructor(new URL("threads/valid/long-running.worker.ts", import.meta.url),
                {type: "module"}));

            expect(thread).to.not.be.undefined;
            expect(thread.methods.takesTime).to.not.be.undefined;

            const result = thread.methods.takesTime(250);
            expect(thread.numQueuedTasks).to.be.eq(1);
            await thread.settled();
            expect(thread.numQueuedTasks).to.be.eq(0);

            expect(await result).to.be.eq("Hello World!");

            await thread.terminate(true);
        });

        it("Test worker Api", async () => {
            const thread = await EsThread.Spawn<TestWorkerApiType>(
                new WorkerContructor(new URL("threads/test-worker-api.worker.ts", import.meta.url),
                {type: "module"}));
    
            expect(thread).to.not.be.undefined;
            expect(thread.methods.testWorkerApi).to.not.be.undefined;
    
            try {
                await thread.methods.testWorkerApi(WorkerContructor.name as "Worker" | "SharedWorker");
            }
            catch(e) {
                assert(e instanceof Error, "Exception isn't of 'Error' type");
                assert(false, e.message);
            }
    
            await thread.terminate(true);
        });
    });
}