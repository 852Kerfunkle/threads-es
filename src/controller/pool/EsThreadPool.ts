import { Terminable, WorkerModule } from "../../shared/Worker"
import { EsThread } from "../thread/EsThread"

export const defaultPoolSize = navigator.hardwareConcurrency;

/** Options for thread pools. */
export interface EsPoolOptions {
    /**
     * Gives that pool a name to be used for debug logging, letting you distinguish between log output of different pools.
     * 
     * @defaultValue "EsThreadPool"
     */
    name?: string;

    /**
     * No. of worker threads to spawn and to be managed by the pool.
     * 
     * @defaultValue navigator.hardwareConcurrency
     */
    size?: number;

    /** Maximum no. of tasks to run on one worker thread at a time. Defaults to one. */
    //concurrency?: number;
}

/**
 * A pool of EsThreads.
 * 
 * @example
 * When used with {@link https://developer.mozilla.org/docs/Web/API/SharedWorker | SharedWorker},
 * make sure to spawn each {@link EsThread} thread with a unique name in WorkerOptions.
 * ```ts
 * const pool = await EsThreadPool.Spawn<HelloWorldApiType>((threadId) => EsThread.Spawn(
 *     new SharedWorker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
 *     {type: "module", name: `HelloWorldWorker #${threadId}`})), {size: 8});
 * ```
 */
export class EsThreadPool<ApiType extends WorkerModule> implements Terminable {
    private readonly threads: EsThread<ApiType>[] = [];
    readonly options: Required<EsPoolOptions>;
    //readonly concurrency: number;

    private constructor(poolOptions: EsPoolOptions = {}) {
        this.options = {
            size: poolOptions.size || defaultPoolSize,
            name: poolOptions.name || "EsThreadPool"
            //concurrency: poolOptions.concurrency || 1;
        }
    }

    /**
     * Spawn a new thread pool.
     * @param spawnThread - Callback that spawns a new thread.
     * @param poolOptions - The options for this thread pool
     * @returns A new thread pool.
     */
    public static async Spawn<ApiType extends WorkerModule>(
        spawnThread: (threadId: number) => Promise<EsThread<ApiType>>,
        poolOptions: EsPoolOptions = {})
    {
        const pool = new EsThreadPool<ApiType>(poolOptions);
        pool.threads.push(...await Promise.all([...Array(pool.options.size).keys()].map((_, idx) => spawnThread(idx))));
        // TODO: when the threads fail to spawn, make sure all threads are terminated properly.
        return pool;
    }

    /**
     * Queue a new task on the pool.
     * @param taskFunction - A callback to execute on a thread.
     * @returns The task result promise.
     */
    public async queue<Return>(taskFunction: (thread: EsThread<ApiType>) => Promise<Return>) {
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

    /** Returns a promise that resolves when all tasks in all threads are settled. */
    public async settled(): Promise<void> {
        const settledThreads: Promise<void>[] = [];
        for (const thread of this.threads) {
            settledThreads.push(thread.settled());
        }
        await Promise.allSettled(settledThreads);
    }

    /**
     * Returns a promise that resolves when all tasks in all threads are resolved
     * and rejects when any task rejects.
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
     * Waits for all tasks in all threads to settle. If tasks resolving is required, call
     * {@link EsThreadPool#resolved} before calling {@link EsThreadPool#terminate}.
     * 
     * @param forceTerminateShared - If you want to make sure SharedWorkers abort.
     * Probably not a great idea, but one might want to do it.
     * 
     * @param threadTerminate - Allows running custom cleanup per thread.
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
