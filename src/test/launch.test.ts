import { spawn, EsWorker, Transfer } from "../"
import { expect, assert } from "@esm-bundle/chai"
import { HelloWorldApiType } from "./threads/hello-world.worker"
import { TransferArrayApiType } from "./threads/transfer-array.worker";

describe("Run some basic tests", () => {
    it("Launch a simple worker", async () => {
        const thread = await spawn<HelloWorldApiType>(
            new EsWorker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.worker).to.not.be.undefined;
        expect(thread.helloWorld).to.not.be.undefined;

        expect(await thread.helloWorld()).to.be.eq("Hello World!");

        thread.worker.terminate();
    });

    it("Launch a worker with transfer", async () => {
        const thread = await spawn<TransferArrayApiType>(
            new EsWorker(new URL("threads/transfer-array.worker.ts", import.meta.url),
            {type: "module"}));

        expect(thread).to.not.be.undefined;
        expect(thread.worker).to.not.be.undefined;
        expect(thread.transferArray).to.not.be.undefined;

        const arrayIn = new Uint8Array(10);
        arrayIn.forEach((value, index) => { arrayIn[index] = index });

        const arrayOut = await thread.transferArray(Transfer(arrayIn.buffer));

        expect(arrayOut.byteLength).to.be.eq(10);
        expect(new Uint8Array(arrayOut.byteLength)).to.be.eql(new Uint8Array([0,0,0,0,0,0,0,0,0,0]));

        thread.worker.terminate();
    });
});