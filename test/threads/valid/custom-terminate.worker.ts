import { delay } from "../../../src/shared/Utils";
import { exposeApi } from "../../../src/worker/Worker"

let initialised = false;

const customTerminateApi = {
    initialise: () => {
        initialised = true;
    },
    doWork: async (ms: number) => {
        if(!initialised) throw new Error("Thread was not initialised");
        await delay(ms);
        return "Hello World!";
    },
    terminate: () => {
        if(!initialised) throw new Error("Thread was not initialised");
        return 42;
    }
}

export type CustomTerminateApiType = typeof customTerminateApi;

exposeApi(customTerminateApi);