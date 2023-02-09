import { EsThread } from "../../../src/controller";
import { exposeApi } from "../../../src/worker/Worker"
import { AsyncHelloWorldApiType } from "./async-api.worker";

let thread: EsThread<AsyncHelloWorldApiType>;

const withSubworkerApi = {
    init: async () => {
        thread = await EsThread.Spawn<AsyncHelloWorldApiType>(
            new Worker(new URL("./async-api.worker.ts", import.meta.url),
            {type: "module"}));
    },
    shutdown: async () => {
        await thread.terminate();
    },
    helloWorld: async () => {
        return thread.methods.helloWorld();
    }
}

export type WithSubworkerApiType = typeof withSubworkerApi;

exposeApi(withSubworkerApi);