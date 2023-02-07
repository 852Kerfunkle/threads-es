import { WorkerJobErrorMessage, WorkerJobResultMessage, WorkerMessageType } from "../../src/shared/Messages";
import { exposeApi } from "../../src/worker/Worker"

const postWeirdResultApi = {
    postWeird: () => {
        const jobResultMessage: WorkerJobResultMessage = {
            type: WorkerMessageType.JobResult,
            uid: "invalidTaskUID",
            result: 1 };
        globalThis.postMessage(jobResultMessage);
        
        const jobErrorMessage: WorkerJobErrorMessage = {
            type: WorkerMessageType.JobError,
            uid: "invalidTaskUID",
            errorMessage: "haha" };
        globalThis.postMessage(jobErrorMessage);
    }
}

export type PostWeirdResultApiType = typeof postWeirdResultApi;

exposeApi(postWeirdResultApi);