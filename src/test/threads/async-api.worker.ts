import { exposeApi } from "../../worker/Worker"

const asyncHelloWorldApi = {
    helloWorld: async (): Promise<String> => {
        return "Hello World!";
    }
}

export type AsyncHelloWorldApiType = typeof asyncHelloWorldApi;

exposeApi(asyncHelloWorldApi);