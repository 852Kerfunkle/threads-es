import { expect, assert } from "@esm-bundle/chai"
import { assert as assertUtil, getRandomUIDLegacy } from "../src/shared/Utils";
import { assertMessageEvent } from "../src/shared/Messages";
import { assertSharedWorkerScope, assertWorkerScope, isDedicatedWorkerScope,
    isSharedWorkerContext, isSharedWorkerScope, isWorkerScope } from "../src/worker/Utils";

describe("Other tests", () => {
    it("Test messages/events", () => {
        expect(() => assertMessageEvent(new Event("error"))).to.throw("Not MessageEvent");
    });

    it("Test scope/context functions failing in Window context", async () => {
        // None of these should ever be true or not throw in Window context.
        expect(isWorkerScope(self)).to.be.false;
        expect(isDedicatedWorkerScope(self)).to.be.false;
        expect(isSharedWorkerScope(self)).to.be.false;
        // @ts-expect-error: test case
        expect(isSharedWorkerContext(self)).to.be.false;

        expect(() => assertWorkerScope(self)).to.throw("Not in a WebWorker");
        expect(() => assertSharedWorkerScope(self)).to.throw("Not in a shared web worker");

        // Don't test Worker stuff for now. Until there's a polyfill.
        //expect(() => exposeApi({test: () => {}})).to.throw("Not in a WebWorker");
    });

    it("Test assert util", () => {
        expect(() => assertUtil(false)).to.throw("Assertion failed");
        expect(() => assertUtil(true)).to.not.throw("Assertion failed");
    });

    it("Test getRandomUIDLegacy", () => {
        expect(getRandomUIDLegacy()).to.not.throw;
        expect(getRandomUIDLegacy()).to.have.length(32);
    });
});