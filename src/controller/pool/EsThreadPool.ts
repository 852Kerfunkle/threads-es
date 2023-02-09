import { Terminable, WorkerModule } from "../../shared/Worker"
import { EsThread } from "../thread/EsThread"

export const defaultPoolSize = navigator.hardwareConcurrency;

export interface EsPoolOptions {
    /** Gives that pool a name to be used for debug logging, letting you distinguish between log output of different pools. */
    name?: string;

    /** No. of worker threads to spawn and to be managed by the pool. */
    size?: number;

    /** Maximum no. of tasks to run on one worker thread at a time. Defaults to one. */
    //concurrency?: number;
}

/**
 * A pool of EsThreads.
 * NOTE: You probably don't want to use it with SharedWorker threads. It doesn't really make sense.
 */
export class EsThreadPool<ApiType extends WorkerModule> implements Terminable {
    private threads: EsThread<ApiType>[] = [];
    readonly options: Required<EsPoolOptions>;
    //readonly concurrency: number;

    private constructor(poolOptions: EsPoolOptions = {}) {
        this.options = {
            size: poolOptions.size || defaultPoolSize,
            name: poolOptions.name || "EsThreadPool"
            //concurrency: poolOptions.concurrency || 1;
        }
    }

    public static async Spawn<ApiType extends WorkerModule>(
        spawnThread: () => Promise<EsThread<ApiType>>,
        poolOptions: EsPoolOptions = {})
    {
        const pool = new EsThreadPool<ApiType>(poolOptions);
        pool.threads = await Promise.all([...Array(pool.options.size).keys()].map(() => spawnThread()));
        // TODO: when the threads fail to spawn, make sure all threads are terminated properly.
        return pool;
    }

    public async queue<Return>(taskFunction: (worker: EsThread<ApiType>) => Promise<Return>) {
        return taskFunction(this.threads[this.findThreadWithFewTasks()]);
    }

    private findThreadWithFewTasks(): number {
        let min = Infinity;
        let threadId = 0;
        for (const [idx, thread] of this.threads.entries()) {
            if(thread.numQueuedTasks < min) {
                threadId = idx;
                min = thread.numQueuedTasks;
            }
        }
        //console.log(`picked thread ${threadId} with ${min} active tasks`);
        return threadId;
    }

    public async settled(): Promise<void> {
        const settledThreads: Promise<void>[] = [];
        for (const thread of this.threads) {
            settledThreads.push(thread.settled());
        }
        await Promise.allSettled(settledThreads);
    }

    public async terminate(): Promise<void> {
        // Should wait for finished tasks and whatever.
        const terminatePromises: Promise<void>[] = [];
        for (const thread of this.threads) {
            terminatePromises.push(thread.terminate());
        }
        await Promise.allSettled(terminatePromises);
    }
}
