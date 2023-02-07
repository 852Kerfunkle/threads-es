import { expect, assert } from "@esm-bundle/chai"
import { EsThread } from "../src/controller";
import { genericWorkerTests } from "./generic.test";
import { PostWeirdResultApiType } from "./threads/post-weird-result.worker";
import { RejectTopApiType } from "./threads/reject-top.worker";
import { ThrowTopApiType } from "./threads/throw-top.worker";
import { WithSubworkerApiType } from "./threads/with-subworker.worker";

describe("Worker tests", () => {
    genericWorkerTests(Worker);

    // Accoding to this SharedWorkers currently can't have sub-workers:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=31666
    // Which is why we only test it for Worker.
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

    // Can't really be tested for SharedWorker, no way to get the message port.
    // TODO: add map of connected clients to Worker, maybe.
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

    // Similarly, these two tests, if an error is thrown before onconnect in the
    // SharedWorker is called, there is nowhere to post to.
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
})