import { spawn, EsWorker } from "../"
import { expect } from "@esm-bundle/chai"

describe("Run some basic tests", () => {
    it("Launch a worker", async () => {
        const api = {
            bleh: async () => { return 10; },
            meh: () => { return ""; }
        }

        const thread = await spawn<typeof api>(
            new EsWorker(new URL("threads/hello-world.worker.ts", import.meta.url),
            {type: "module"}));
        expect(thread.bleh).to.not.be.undefined;
        expect(thread.meh).to.not.be.undefined;
        expect(thread).to.not.be.undefined;
    })
})