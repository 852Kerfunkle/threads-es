import { expect, assert } from "@esm-bundle/chai"
import { EsTaskPromise } from "../src/controller/thread/EsTask";
import { delay } from "../src/shared/Utils";

describe("EsTaskPromise tests", () => {
    it("Can only resolve once", async () => {
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
        await delay(50);
    });

    it("Can only reject once", async () => {
        const taskPromise = new EsTaskPromise<string>();
        let rejectCount = 0;
        taskPromise.then(() => {
            assert(false, "EsTaskPromise resolved unexpectedly")
        }).catch((e) => {
            rejectCount++;
            assert(rejectCount === 1, "Resolved more than once");
            expect(e).to.be.instanceof(Error);
            expect(e.message).to.be.eq("failed");
        })
        taskPromise.reject(new Error("failed"));
        taskPromise.reject(new Error("failed"));
        taskPromise.resolve("success");
        await delay(50);
    });
});