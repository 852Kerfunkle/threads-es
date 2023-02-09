import { exposeApi } from "../../src/worker/Worker"

const postWeirdBeforeExposeApi = {
    helloWorld: () => {
        return "Hello World!";
    }
}

export type PostWeirdBeforeExposeApiType = typeof postWeirdBeforeExposeApi;

globalThis.postMessage({weird: "strange message"});

exposeApi(postWeirdBeforeExposeApi);