import { expect, assert } from "@esm-bundle/chai"
import { EsTaskPromise } from "../src/controller/thread/EsTask";

describe("EsTaskPromise tests", () => {
    it("Can only resolve once", () => {
        const taskPromise = new EsTaskPromise<string>();
        let resolveCount = 0;
        taskPromise.then((res) => {
            resolveCount++;
            assert(resolveCount === 1, "Resolved more than once");
            expect(res).to.be.eq("success");
        }).catch(() => {
            assert(false, "EsTaskPromise rejected unexpectedly")
        })
        taskPromise.resolve("success");
        taskPromise.resolve("success");
        taskPromise.reject(new Error("failed"));
    });

    it("Can only reject once", () => {
        const taskPromise = new EsTaskPromise<string>();
        let rejectCount = 0;
        taskPromise.then(() => {
            assert(false, "EsTaskPromise resolved unexpectedly")
        }).catch((e) => {
            rejectCount++;
            assert(rejectCount === 1, "Resolved more than once");
            expect(e).to.be.instanceof(Error);
            expect(e.messages).to.be.eq("failed");
        })
        taskPromise.reject(new Error("failed"));
        taskPromise.reject(new Error("failed"));
        taskPromise.resolve("success");
    });
});