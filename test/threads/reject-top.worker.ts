import { exposeApi } from "../../src/worker/Worker"

const rejectTopApi = {
    helloWorld: () => {
        return("Hello World!");
    }
}

export type RejectTopApiType = typeof rejectTopApi;

Promise.reject(new Error("spoohw")).then(() => {
    exposeApi(rejectTopApi);
});