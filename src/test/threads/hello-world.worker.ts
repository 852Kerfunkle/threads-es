import { exposeApi } from "../../thread"

console.log("hello world");

exposeApi({
    helloWorld: () => {
        return "Hello world";
    }
})