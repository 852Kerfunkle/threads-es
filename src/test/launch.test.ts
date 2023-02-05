import { spawn, EsWorker } from "../"
import { expect } from "@esm-bundle/chai"

describe("Run some basic tests", () => {
    it("Launch a worker", async () => {
        const api = {
            bleh: async () => { return 10; },
            meh: () => { return ""; }
        }

        const thread = await spawn<typeof api>(new EsWorker(new URL("../threads/hello-world.js", import.meta.url)))
        expect(thread).to.not.be.undefined; //
    })
})