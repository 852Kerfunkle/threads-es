import { delay } from "../../src/shared/Utils";
import { exposeApi } from "../../src/worker/Worker"

const longRunningApi = {
    takesTime: async (ms: number) => {
        await delay(ms);
        return "Hello World!";
    }
}

export type LongRunningApiType = typeof longRunningApi;

exposeApi(longRunningApi);