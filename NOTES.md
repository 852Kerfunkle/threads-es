# Notes

## A bunch of EsTaskPromise variants...

Some slower, some faster, some less standards compliant, some more.

```ts
/*type ResolveFn<T> = (value: T | PromiseLike<T>) => void;
type RejectFn = (reason?: Error) => void;
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopExecutor = () => {};

export class EsTaskPromise<T> extends Promise<T> {
    public readonly taskUID: TaskUID = getRandomUID();
    private readonly resolveFn: ResolveFn<T>;
    private readonly rejectFn: RejectFn;
    private settled = false;

    constructor(executor: (resolve: ResolveFn<T>, reject: RejectFn) => void = noopExecutor) {
        let localResolve: ResolveFn<T> | undefined;
        let localReject: RejectFn | undefined;
        super((resolve, reject) => {
            localResolve = resolve;
            localReject = reject;
            executor(resolve, reject);
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.resolveFn = localResolve!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.rejectFn = localReject!;
    }

    public resolve(value: T): void {
        if (!this.settled) {
            this.settled = true;
            this.resolveFn(value);
        }
    }

    public reject(error: Error): void {
        if (!this.settled) {
            this.settled = true;
            this.rejectFn(error);
        }
    }
}*/

/*export class EsTaskPromise<T> extends Promise<T> {
    public readonly taskUID: TaskUID = getRandomUID();
    // @ ts-expect-error: is definitely assigned
    private resolveFn: ResolveFn<T>;
    // @ ts-expect-error: is definitely assigned
    private rejectFn: RejectFn;
    private settled = false;

    public static Create<T>() {
        let localResolve: ResolveFn<T>;
        let localReject: RejectFn;
        const task = new EsTaskPromise<T>((resolve, reject) => {
            localResolve = resolve;
            localReject = reject;
        });

        // @ ts-expect-error: is definitely assigned before use
        task.resolveFn = localResolve;
        // @ ts-expect-error: is definitely assigned before use
        task.rejectFn = localReject;
        return task;
    }

    private constructor(executor: (resolve: ResolveFn<T>, reject: RejectFn) => void) {
        super(executor);
    }

    resolve(value: T): void {
        if (!this.settled) {
            this.settled = true;
            this.resolveFn(value);
        }
    }

    reject(error: Error): void {
        if (!this.settled) {
            this.settled = true;
            this.rejectFn(error);
        }
    }
}*/

/*export class EsTaskPromise<Return> extends Promise<Return> {
    public readonly taskUID: TaskUID = getRandomUID();
    // @ ts-expect-error: is definitely assigned
    public recieveTaskResult: ((result: WorkerMessage) => void);

    private constructor(executor: (resolve: ResolveFn<Return>, reject: RejectFn) => void) {
        super(executor);
    }

    public static Create<Return>() {
        let recieveTaskResult: ((result: WorkerMessage) => void);
        const task = new EsTaskPromise<Return>((resolve, reject) => {
            recieveTaskResult = (msg: WorkerMessage) => {
                switch(msg.type) {
                    case WorkerMessageType.TaskResult:
                        resolve(msg.result as Return);
                        break;

                    case WorkerMessageType.TaskError:
                        reject(new Error(msg.errorMessage));
                        break;

                    default:
                        throw new Error(`Task recieved unecpected message type: ${msg.type}`);
                }
            }
        });

        // @ ts-expect-error: is definitely assigned before use
        task.recieveTaskResult = recieveTaskResult;
        return task;
    }
}*/

/*export class EsTaskPromise<Return> extends Promise<Return> {
    public readonly taskUID: TaskUID = getRandomUID();
    public readonly recieveTaskResult: ((result: WorkerMessage) => void);
    private settled = false;

    static get [Symbol.species]() {
        return Promise;
    }

    constructor() {
        let recieveTaskResult: ((result: WorkerMessage) => void);
        super((resolve, reject) => {
            recieveTaskResult = (msg: WorkerMessage) => {
                if(!this.settled){
                    this.settled = true;
                    switch(msg.type) {
                        case WorkerMessageType.TaskResult:
                            resolve(msg.result as Return);
                            break;

                        case WorkerMessageType.TaskError:
                            reject(new Error(msg.errorMessage));
                            break;

                        default:
                            throw new Error(`Recieved unecpected message for task ${this.taskUID}`);
                    }
                }
            }
        });

        // @ ts-expect-error: is definitely assigned before use
        this.recieveTaskResult = recieveTaskResult;
    }
}*/

/*export class EsTaskPromise<Return> extends Promise<Return> {
    readonly taskUID: TaskUID = getRandomUID();

    public reject!: (reason?: any) => void;
    public resolve!: (value: Return | PromiseLike<Return>) => void;

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

        // @ ts-expect-error: is assigned
        task.reject = taskReject;
        // @ ts-expect-error: is assigned
        task.resolve = taskResolve;
        return task;
    }
}*/

/*export class EsTask {
    readonly taskUID: TaskUID = getRandomUID();

    public notifyResult: ((result: WorkerMessage) => void) | null = null;
}

function taskResultPromise<ReturnType>(task: EsTask): Promise<ReturnType> {
    return new Promise<ReturnType>((resolve, reject) => {
        const recieveTaskResult = (msg: WorkerMessage) => {
            try {
                task.notifyResult = null;

                if(isWorkerTaskResultMessage(msg)) {
                    if(msg.uid !== task.taskUID) throw new Error(`Recieved result for wrong task: ${msg.uid}, expected ${task.taskUID}`);
                    resolve(msg.result as ReturnType);
                }
                else if(isWorkerTaskErrorMessage(msg)) {
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
```