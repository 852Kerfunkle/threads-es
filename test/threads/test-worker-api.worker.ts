import { exposeApi } from "../../src/worker/Worker"
import { expect, assert } from "@esm-bundle/chai"
import { assertSharedWorkerScope, assertWorkerScope, isDedicatedWorkerScope,
    isSharedWorkerContext, isSharedWorkerScope, isWorkerScope } from "../../src/worker/Utils";

const testWorkerApi = {
    testWorkerApi: (workerType: "Worker" | "SharedWorker") => {
        expect(isWorkerScope(self)).to.be.true;
        // @ts-expect-error: test case
        expect(isDedicatedWorkerScope(self)).to.be.eq(workerType === "Worker");
        // @ts-expect-error: test case
        expect(isSharedWorkerScope(self)).to.be.eq(workerType === "SharedWorker");

        // No way to get the current context...
        // TODO: maybe we could bind the execution to the context?
        // @ts-expect-error: test case
        expect(isSharedWorkerContext(self)).to.be.false;

        if(workerType === "Worker") {
            expect(() => assertWorkerScope(self)).to.be.ok;
            // @ts-expect-error: test case
            expect(() => assertSharedWorkerScope(self)).to.throw("Not in a shared web worker");
        }
        else {
            expect(() => assertWorkerScope(self)).to.be.ok;
            // @ts-expect-error: test case
            expect(() => assertSharedWorkerScope(self)).be.ok;
        }

        expect(() => exposeApi(testWorkerApi)).to.throw("exposeApi() should only be called once.");
    }
}

export type TestWorkerApiType = typeof testWorkerApi;

exposeApi(testWorkerApi);