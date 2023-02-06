import { exposeApi } from "../../worker/Worker"

const throwHelloWorldApi = {
    helloWorld: async (): Promise<string> => {
        throw new Error("Hello World!");
    }
}

export type ThrowHelloWorldApiType = typeof throwHelloWorldApi;

exposeApi(throwHelloWorldApi);