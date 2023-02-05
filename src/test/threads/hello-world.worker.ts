import { exposeApi } from "../../worker/Worker"

const helloWorldApi = {
    helloWorld: () => {
        return "Hello World!";
    }
}

export type HelloWorldApiType = typeof helloWorldApi;

exposeApi(helloWorldApi);