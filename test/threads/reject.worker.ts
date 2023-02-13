import { delay } from "../../src/shared/Utils";
import { exposeApi } from "../../src/worker/Worker"

const rejectApi = {
    helloWorld: () => {
        return("Hello World!");
    }
}

export type RejectApiType = typeof rejectApi;

delay(50).then(() => Promise.reject(new Error("it had to happen eventually")));

exposeApi(rejectApi);