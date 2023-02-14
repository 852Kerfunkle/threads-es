const exposeApiNotCalledApi = {
    helloWorld: () => {
        return "Hello World!";
    }
}

export type ExposeApiNotCalledApiType = typeof exposeApiNotCalledApi;