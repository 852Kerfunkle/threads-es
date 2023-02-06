import { EsThreadProxy, spawn } from "../../controller";
import { exposeApi } from "../../worker/Worker"
import { AsyncHelloWorldApiType } from "./async-api.worker";

var thread: EsThreadProxy<AsyncHelloWorldApiType>;

const withSubworkerApi = {
    init: async () => {
        thread = await spawn<AsyncHelloWorldApiType>(
            new Worker(new URL("./async-api.worker.ts", import.meta.url),
            {type: "module"}));
    },
    shutdown: async () => {
        thread.terminate();
    },
    helloWorld: async () => {
        return thread.helloWorld();
    }
}

export type WithSubworkerApiType = typeof withSubworkerApi;

exposeApi(withSubworkerApi);