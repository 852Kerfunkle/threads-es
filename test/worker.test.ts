import { expect, assert } from "@esm-bundle/chai"
import { EsThread } from "../src/controller";
import { genericWorkerTests } from "./generic.test";
import { PostWeirdBeforeExposeApiType } from "./threads/post-weird-before-exposeApi.worker";
import { PostWeirdResultApiType } from "./threads/post-weird-result.worker";
import { RejectTopApiType } from "./threads/reject-top.worker";
import { ThrowTopApiType } from "./threads/throw-top.worker";
import { WithSubpoolApiType } from "./threads/valid/with-subpool.worker";
import { WithSubworkerApiType } from "./threads/valid/with-subworker.worker";

describe("Worker tests", () => {
    genericWorkerTests(Worker);

    // Accoding to this SharedWorkers currently can't have sub-workers:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=31666
    // Which is why we only test it for Worker.
    it("Subworkers", async () => {
        const thread = await EsThread.Spawn<WithSubworkerApiType>(
            new Worker(new URL("threads/valid/with-subworker.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.init).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;
        expect(thread.methods.shutdown).to.not.be.undefined;

        await thread.methods.init();
        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");
        await thread.methods.shutdown();

        await thread.terminate();
    });

    it("Subpool", async () => {
        const thread = await EsThread.Spawn<WithSubpoolApiType>(
            new Worker(new URL("threads/valid/with-subpool.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.init).to.not.be.undefined;
        expect(thread.methods.poolHelloWorld).to.not.be.undefined;
        expect(thread.methods.shutdown).to.not.be.undefined;

        await thread.methods.init();
        expect(await thread.methods.poolHelloWorld()).to.be.eq("Hello World!");
        await thread.methods.shutdown();

        await thread.terminate();
    });

    // Can't really be tested for SharedWorker, no way to get the message port.
    // TODO: add map of connected clients to Worker, maybe.
    it("Posts invalid results", async () => {
        const thread = await EsThread.Spawn<PostWeirdResultApiType>(
            new Worker(new URL("threads/post-weird-result.worker.ts", import.meta.url),
            {type: "module"}));

        let errorsRecived = 0;
        const validErrors = [
            "Recieved unexpected WorkerMessage of type: undefined",
            "Recived result for invalid task with UID invalidTaskUID",
            "Recived error for invalid task with UID invalidTaskUID"
        ];

        thread.addEventListener("error", (evt: Event) => {
            errorsRecived++;
            assert(evt instanceof ErrorEvent, "event was not of ErrorEvent type");
            assert(evt.error instanceof Error, "error was not of Error type");
            expect(validErrors).to.include(evt.error.message)
        });

        await thread.methods.postWeird();

        expect(errorsRecived).to.be.eq(3);

        await thread.terminate();
    });

    it("Post weird message before exposeApi", async () => {
        try {
            await EsThread.Spawn<PostWeirdBeforeExposeApiType>(
                new Worker(new URL("threads/post-weird-before-exposeApi.worker.ts", import.meta.url),
                {type: "module"}));
            assert(false, "No error was thrown");
        }
        catch(e) {
            assert(e instanceof Error, "Exception isn't of 'Error' type");
            expect(e.message).to.contain("Recieved unexpected WorkerMessage of type");
        }
    });

    // Similarly, these two tests, if an error is thrown before onconnect in the
    // SharedWorker is called, there is nowhere to post to.
    it("Throws before exposeApi", async () => {
        try {
            await EsThread.Spawn<ThrowTopApiType>(
                new Worker(new URL("threads/throw-top.worker.ts", import.meta.url),
                {type: "module"}));
            assert(false, "No error was thrown");
        }
        catch(e) {
            assert(e instanceof Error, "Exception isn't of 'Error' type");
            expect(e.message).to.be.eq("whoops");
        }
    });

    it("Rejects before exposeApi", async () => {
        try {
            await EsThread.Spawn<RejectTopApiType>(
                new Worker(new URL("threads/reject-top.worker.ts", import.meta.url),
                {type: "module"}));
            assert(false, "No error was thrown");
        }
        catch(e) {
            assert(e instanceof Error, "Exception isn't of 'Error' type");
            expect(e.message).to.be.eq("spoohw");
        }
    });

    // TODO: find (or make) a Worker and SharedWorker polyfill!
    /*it("Test with Worker polyfill", async () => {
        window.Worker = ???
        genericWorkerTests(PseudoWorker);
    });*/
})