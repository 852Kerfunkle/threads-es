import { exposeApi } from "../../../src/worker/Worker"

const asyncHelloWorldApi = {
    helloWorld: async (): Promise<string> => {
        return "Hello World!";
    }
}

export type AsyncHelloWorldApiType = typeof asyncHelloWorldApi;

exposeApi(asyncHelloWorldApi);