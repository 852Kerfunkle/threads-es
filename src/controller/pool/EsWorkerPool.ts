import { WorkerModule } from "../../shared/Worker"
import { EsThreadProxy } from "../thread/EsThread"

export const defaultPoolSize = typeof navigator !== "undefined" && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency : 4;

export interface EsPoolOptions {
    /** Maximum no. of tasks to run on one worker thread at a time. Defaults to one. */
    //concurrency?: number

    /** Gives that pool a name to be used for debug logging, letting you distinguish between log output of different pools. */
    name?: string

    /** No. of worker threads to spawn and to be managed by the pool. */
    size?: number
}


export class EsWorkerPool<ApiType extends WorkerModule<any>> {
    private spawnThread: () => Promise<EsThreadProxy<ApiType>>;
    private threads: EsThreadProxy<ApiType>[] = [];
    readonly size: number;
    readonly name: string;
    //readonly concurrency: number;

    constructor(
        spawnThread: () => Promise<EsThreadProxy<ApiType>>,
        poolOptions?: EsPoolOptions)
    {
        this.spawnThread = spawnThread;
        const options = poolOptions ? poolOptions : {};
        this.size = options.size || defaultPoolSize;
        this.name = options.name || "EsWorkerPool";
        //this.concurrency = options.concurrency || 1;
    }

    public async spawnThreads(): Promise<void> {
        this.threads = await Promise.all([...Array(this.size).keys()].map(() => this.spawnThread()));
    }

    public async queue<Return>(taskFunction: (worker: EsThreadProxy<ApiType>) => Promise<Return>) {
        return taskFunction(this.threads[this.findThreadWithFewTasks()]);
    }

    private findThreadWithFewTasks(): number {
        let min = Infinity;
        let threadId = 0;
        for (const [idx, thread] of this.threads.entries()) {
            if(thread.numQueuedJobs < min) {
                threadId = idx;
                min = thread.numQueuedJobs;
            }
        }
        //console.log(`picked thread ${threadId} with ${min} active tasks`);
        return threadId;
    }

    public async terminate() {
        // Wait for finished tasks and whatever
        const terminatePromises: Promise<void>[] = [];
        for (const thread of this.threads) {
            terminatePromises.push(thread.terminate());
        }
        await Promise.allSettled(terminatePromises);
    }
}
