import { TaskUID } from "../../shared/Messages";
import { getRandomUID } from "../../shared/Utils";

export class EsTaskPromise<Return> extends Promise<Return> {
    readonly taskUID: TaskUID = getRandomUID();

    public resolve!: (value: Return | PromiseLike<Return>) => void;
    public reject!: (reason?: any) => void;

    private constructor(executor: (resolve: (value: Return | PromiseLike<Return>) => void, reject: (reason?: any) => void) => void) {
        super(executor);
    }

    static Create<Return>() {
        let taskReject: (reason?: any) => void;
        let taskResolve: (value: Return | PromiseLike<Return>) => void;

        const task = new EsTaskPromise<Return>((resolve, reject) => {
            taskReject = reject;
            taskResolve = resolve;
        });

        // @ts-expect-error: is assigned
        task.reject = taskReject;
        // @ts-expect-error: is assigned
        task.resolve = taskResolve;
        return task;
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