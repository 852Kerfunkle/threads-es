import { TaskUID } from "../../shared/messages";
import { getRandomUID } from "../../shared/Utils";

export class EsPromiseTask<Return> {
    readonly taskUID: TaskUID = getRandomUID();
    readonly promise: Promise<Return>;

    public resolve!: (value: Return | PromiseLike<Return>) => void;
    public reject!: (reason?: any) => void;

    constructor() {
        this.promise = new Promise<Return>((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        })
    }
}

/*export class EsTask {
    readonly taskUID: TaskUID = getRandomUID();

    public notifyResult: ((result: WorkerMessage) => void) | null = null;
}

function taskResultPromise<ReturnType>(task: EsTask): Promise<ReturnType> {
    return new Promise<ReturnType>((resolve, reject) => {
        const recieveTaskResult = (msg: WorkerMessage) => {
            try {
                task.notifyResult = null;

                if(isWorkerJobResultMessage(msg)) {
                    if(msg.uid !== task.taskUID) throw new Error(`Recieved result for wrong task: ${msg.uid}, expected ${task.taskUID}`);
                    resolve(msg.result as ReturnType);
                }
                else if(isWorkerJobErrorMessage(msg)) {
                    if(msg.uid !== task.taskUID) throw new Error(`Recieved error for wrong task: ${msg.uid}, expected ${task.taskUID}`);
                    throw new Error(msg.errorMessage);
                }
                else {
                    throw new Error(`Recieved unecpected message for task ${task.taskUID}`);
                }
            }
            catch(e) {
                reject(e);
            }
        }

        task.notifyResult = recieveTaskResult;
    })
}

export function createTaskWithPromise<ResultType>(): [EsTask, Promise<ResultType>] {
    const task = new EsTask();

    return [task, taskResultPromise(task)];
}*/