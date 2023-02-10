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
 * NOTE: Works with SharedWorker, but you need to make sure to instantiate each SharedWorker
 * thread with a unique name (see pool.test.ts).
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
        spawnThread: (threadId: number) => Promise<EsThread<ApiType>>,
        poolOptions: EsPoolOptions = {})
    {
        const pool = new EsThreadPool<ApiType>(poolOptions);
        pool.threads = await Promise.all([...Array(pool.options.size).keys()].map((_, idx) => spawnThread(idx)));
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

    /**
     * Wait for all tasks in all threads to settle.
     */
    public async settled(): Promise<void> {
        const settledThreads: Promise<void>[] = [];
        for (const thread of this.threads) {
            settledThreads.push(thread.settled());
        }
        await Promise.allSettled(settledThreads);
    }

    /**
     * Wait for all task in all threads to resolve.
     */
    public async resolved(): Promise<void> {
        const settledThreads: Promise<void>[] = [];
        for (const thread of this.threads) {
            settledThreads.push(thread.resolved());
        }
        await Promise.all(settledThreads);
    }

    /**
     * Terminate all threads in the pool.
     * 
     * Waits for all tasks to resolve. If tasks resolving is not important, call
     * `EsThreadPool.settled()` before calling `terminate()`.
     * 
     * @param forceTerminateShared If you want to make sure SharedWorkers abort.
     * Probably not a great idea, but one might want to do it.
     * 
     * @param threadTerminate Allows running custom cleanup per thread.
     */
    public async terminate(threadTerminate?: (
        thread: EsThread<ApiType>) => Promise<void>,
        forceTerminateShared?: boolean): Promise<void> 
    {
        const doTerminate = async (thread: EsThread<ApiType>) => {
            if(threadTerminate) await threadTerminate(thread);
            await thread.terminate(forceTerminateShared);
        }

        const terminatePromises: Promise<void>[] = [];
        for (const thread of this.threads) {
            terminatePromises.push(doTerminate(thread));
        }

        await Promise.all(terminatePromises);
    }
}
