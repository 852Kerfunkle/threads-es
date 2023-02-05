import { expect } from "@esm-bundle/chai"
import { HelloWorldApiType } from "./threads/hello-world.worker"
import { TransferArrayApiType } from "./threads/transfer-array.worker";
import { AsyncHelloWorldApiType } from "./threads/async-api.worker";
import { spawn } from "../controller";
import { Transfer } from "../shared";

describe("Run some basic worker tests", () => {
    it("Launch a simple worker", async () => {
        const thread = await spawn<HelloWorldApiType>(
            new Worker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.helloWorld).to.not.be.undefined;

        expect(await thread.helloWorld()).to.be.eq("Hello World!");

        thread.terminate();
    });

    it("Launch a worker with transfer", async () => {
        const thread = await spawn<TransferArrayApiType>(
            new Worker(new URL("threads/transfer-array.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.transferArray).to.not.be.undefined;

        const arrayIn = new Uint8Array(10);
        arrayIn.forEach((value, index) => { arrayIn[index] = index });

        const arrayOut = await thread.transferArray(Transfer(arrayIn.buffer));

        expect(arrayOut.byteLength).to.be.eq(10);
        expect(new Uint8Array(arrayOut.byteLength)).to.be.eql(new Uint8Array([0,0,0,0,0,0,0,0,0,0]));

        thread.terminate();
    });

    it("Launch a worker with async api", async () => {
        const thread = await spawn<AsyncHelloWorldApiType>(
            new Worker(new URL("threads/async-api.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.helloWorld).to.not.be.undefined;

        expect(await thread.helloWorld()).to.be.eq("Hello World!");

        thread.terminate();
    });

    /*it("Launch a sahred worker", async () => {
        const thread = await spawn<HelloWorldApiType>(
            new EsSharedWorker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.worker).to.not.be.undefined;
        expect(thread.helloWorld).to.not.be.undefined;

        expect(await thread.helloWorld()).to.be.eq("Hello World!");

        thread.worker.terminate();
    });*/
});