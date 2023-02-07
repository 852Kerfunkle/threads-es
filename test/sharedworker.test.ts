import { expect, assert } from "@esm-bundle/chai"
import { EsThread } from "../src/controller";
import { HelloWorldApiType } from "./threads/hello-world.worker"

describe("SharedWorker tests", () => {
    it("Basic", async () => {
        const thread = await EsThread.Spawn<HelloWorldApiType>(
            new SharedWorker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

        await thread.terminate();
    });

    // Accoding to this SharedWorkers currently can't have sub-workers:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=31666
    /*it("Subworkers", async () => {
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