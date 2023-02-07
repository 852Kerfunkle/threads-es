import { expect, assert } from "@esm-bundle/chai"
import { genericWorkerTests } from "./generic.test";

describe("SharedWorker tests", () => {
    genericWorkerTests(SharedWorker);

    // Currently no specific tests for SharedWorker.
});