import { delay } from "../../src/shared/Utils";
import { exposeApi } from "../../src/worker/Worker"

const longRunningApi = {
    takesTime: async () => {
        await delay(250);
        return "Hello World!";
    }
}

export type LongRunningApiType = typeof longRunningApi;

exposeApi(longRunningApi);