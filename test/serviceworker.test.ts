import { expect, assert } from "@esm-bundle/chai"
import { EsThread } from "../src/controller";
import { HelloWorldApiType } from "./threads/valid/hello-world.worker"

describe("ServiceWorker tests", () => {
    // TODO: figure out what to do with service workers.
    /*it("Basic", async () => {
        const serviceWorker = await navigator.serviceWorker.register(new URL("threads/hello-world.worker.ts", import.meta.url), {type: "module"});
        assert(serviceWorker.active);

        const thread = await EsThread.Spawn<HelloWorldApiType>(serviceWorker.active);

        expect(thread).to.not.be.undefined;
        expect(thread.methods.helloWorld).to.not.be.undefined;

        expect(await thread.methods.helloWorld()).to.be.eq("Hello World!");

        await thread.terminate();
    });*/
});