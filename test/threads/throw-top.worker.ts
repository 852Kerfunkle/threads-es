import { exposeApi } from "../../src/worker/Worker"

const throwTopApi = {
    helloWorld: () => {
        return("Hello World!");
    }
}

export type ThrowTopApiType = typeof throwTopApi;

throw new Error("whoops")

exposeApi(throwTopApi);