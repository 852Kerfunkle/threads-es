import { WorkerTaskErrorMessage, WorkerTaskResultMessage, WorkerMessageType } from "../../src/shared/Messages";
import { exposeApi } from "../../src/worker/Worker"

const postWeirdResultApi = {
    postWeird: () => {
        const taskResultMessage: WorkerTaskResultMessage = {
            type: WorkerMessageType.TaskResult,
            uid: "invalidTaskUID",
            result: 1 };
        globalThis.postMessage(taskResultMessage);
        
        const taskErrorMessage: WorkerTaskErrorMessage = {
            type: WorkerMessageType.TaskError,
            uid: "invalidTaskUID",
            errorMessage: "haha" };
        globalThis.postMessage(taskErrorMessage);

        globalThis.postMessage({weird: "strange message"});
    }
}

export type PostWeirdResultApiType = typeof postWeirdResultApi;

exposeApi(postWeirdResultApi);