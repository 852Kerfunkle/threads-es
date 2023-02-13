import { exposeApi } from "../../src/worker/Worker"

const randomThrowTopApi = {
    helloWorld: () => {
        return("Hello World!");
    }
}

export type RandomThrowTopApiType = typeof randomThrowTopApi;

if(Math.random() > 0.5) throw new Error("whoops");

exposeApi(randomThrowTopApi);