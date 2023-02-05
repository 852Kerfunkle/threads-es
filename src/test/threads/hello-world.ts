import { exposeApi } from "../../thread"

console.log("hello world");

exposeApi({
    helloWorld: () => {
        console.log("Hello world")
    }
})