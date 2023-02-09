import { EsThread, EsThreadPool } from "../../../src/controller";
import { exposeApi } from "../../../src/worker/Worker"
import { AsyncHelloWorldApiType } from "./async-api.worker";

let pool: EsThreadPool<AsyncHelloWorldApiType>;

const withSubpoolApi = {
    init: async () => {
        pool = await EsThreadPool.Spawn<AsyncHelloWorldApiType>(() => EsThread.Spawn(
            new Worker(new URL("./async-api.worker.ts", import.meta.url),
            {type: "module"})), {size: 2});
    },
    shutdown: async () => {
        await pool.terminate();
    },
    poolHelloWorld: async () => {
        return pool.queue(thread => thread.methods.helloWorld());
    }
}

export type WithSubpoolApiType = typeof withSubpoolApi;

exposeApi(withSubpoolApi);