import { assert } from "../../shared/Utils";
import { Terminable, WorkerModule } from "../../shared/Worker"
import { EsThread } from "../thread/EsThread"

/** Options for thread pools. */
export interface EsPoolOptions {
    /**
     * Gives that pool a name to be used for debug logging, letting you distinguish between log output of different pools.
     * 
     * @defaultValue "EsThreadPool"
     */
    name: string;

    /**
     * No. of worker threads to spawn and to be managed by the pool.
     * 
     * @defaultValue navigator.hardwareConcurrency
     */
    size: number;

    /** Maximum no. of tasks to run on one worker thread at a time. Defaults to one. */
    //concurrency: number;
}

const DefaultEsPoolOptions: EsPoolOptions = {
    size: navigator.hardwareConcurrency,
    name: "EsThreadPool",
    //concurrency: 1
}

export type ThreadLifecycleFn<ApiType extends WorkerModule> = (threadId: number, thread: EsThread<ApiType>) => Promise<void>;

/**
 * A pool of EsThreads.
 * 
 * @example
 * When used with {@link https://developer.mozilla.org/docs/Web/API/SharedWorker | SharedWorker},
 * make sure to spawn each {@link EsThread} thread with a unique name in WorkerOptions.
 * ```ts
 * const pool = await EsThreadPool.Spawn((threadId) => EsThread.Spawn<HelloWorldApiType>(
 *     new SharedWorker(new URL("threads/valid/hello-world.worker.ts", import.meta.url),
 *     {type: "module", name: `HelloWorldWorker #${threadId}`})), {size: 8});
 * ```
 */
export class EsThreadPool<ApiType extends WorkerModule> extends EventTarget implements Terminable {
    private readonly threads: EsThread<ApiType>[] = [];
    private readonly terminateThread: ThreadLifecycleFn<ApiType> | undefined;
    readonly options: Readonly<EsPoolOptions>;

    private constructor(
        poolOptions: Partial<EsPoolOptions>,
        terminateThread?: ThreadLifecycleFn<ApiType>)
    {
        super();
        this.options = { ...DefaultEsPoolOptions, ...poolOptions };
        this.terminateThread = terminateThread;
    }

    /**
     * Spawn a new thread pool.
     * 
     * If any thread fails to spawn or any threads `initialiseThread` fails, the entire
     * pool will terminate. Threads are (attempted to be) terminated in that case.
     * 
     * @param spawnThread - Callback that spawns a new thread. If you need to
     * run custom init per thread, use the `initialiseThread` lifecycle function.
     * @param initialiseThread - Allows running custom init per thread.
     * @param terminateThread - Allows running custom cleanup per thread.
     * @param poolOptions - The options for this thread pool.
     * @returns A new thread pool.
     * 
     * @example
     * Spawning a thread pool with thread lifecyle callbacks.
     * 
     * ```ts
     * const pool = await EsThreadPool.Spawn(threadId => EsThread.Spawn<CustomTerminateApiType>(
     *         new Worker(new URL("threads/valid/custom-terminate.worker.ts", import.meta.url),
     *         {type: "module", name: `LongRunningWorker #${threadId}`})),
     *     {size: 2},
     *     (threadId, thread) => {
     *         // returns Promise<void>
     *         return thread.methods.initialise();
     *     },
     *     (threadId, thread) => {
     *         // returns Promise<void>
     *         return thread.methods.terminate();
     *     });
     * ```
     */
    public static async Spawn<ApiType extends WorkerModule>(
        spawnThread: (threadId: number) => Promise<EsThread<ApiType>>,
        poolOptions: Partial<EsPoolOptions> = {},
        initialiseThread?: ThreadLifecycleFn<ApiType>,
        terminateThread?: ThreadLifecycleFn<ApiType>)
    {
        const pool = new EsThreadPool<ApiType>(poolOptions, terminateThread);

        // Spawn a thread, run the init lifecycle and connect the error listener.
        const doSpawn = async (idx: number) => {
            const thread = await spawnThread(idx);
            if(initialiseThread) {
                try {
                    await initialiseThread(idx, thread);
                }
                catch(e) {
                    // If initialiseThread fails, terminate the thread immediately.
                    // Otherwise it will stay alive, because only fulfilled doSpawn
                    // promises are terminated in any fail.
                    await thread.terminate();
                    throw e;
                }
            }
            thread.addEventListener("error", pool.handleErrorEvent);
            return thread;
        }

        const threadSpawnPromises: Promise<EsThread<ApiType>>[] = [];
        for(let idx = 0; idx < pool.options.size; ++idx) {
            threadSpawnPromises.push(doSpawn(idx));
        }

        try {
            // Try to spawn the threads.
            pool.threads.push(...await Promise.all(threadSpawnPromises));
            return pool;
        }
        catch(e) {
            // If spawning the threads fails...
            const res = await Promise.allSettled(threadSpawnPromises);

            // Terminate all threads that spawned successfully and collect all rejection messages.
            // TODO: need to call threadTerminate on all threads that spawned successfully!
            const terminatePromises: Promise<void>[] = [];
            const rejectionMessages: string[] = [];
            for (const [idx, item] of res.entries()) {
                if(item.status === "fulfilled") {
                    terminatePromises.push(pool.doTerminate(idx, item.value));
                }
                if(item.status === "rejected") rejectionMessages.push(`\tThread #${idx}: ${item.reason.toString()}`)
            }

            // I suppose if this fails, we throw our hands in the air and give up.
            await Promise.all(terminatePromises);

            // Throw an error with all rejection messages.
            throw new Error("Failed to spawn thread pool. Errors:\n" + rejectionMessages.join("\n"))
        }
    }

    private readonly handleErrorEvent = ((evt: Event): void => {
        assert(evt instanceof ErrorEvent, "Unhandled event type");
        this.dispatchEvent(new ErrorEvent("error", {error: evt.error}));
    }).bind(this);

    /**
     * Queue a new task on the pool.
     * 
     * Finds a thread with few queued tasks and queues another. Tasks are
     * immediately sent to the thread.
     * 
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

    private async doTerminate(threadId: number, thread: EsThread<ApiType>, forceTerminateShared?: boolean) {
        if(this.terminateThread) await this.terminateThread(threadId, thread);
        thread.removeEventListener("error", this.handleErrorEvent);
        await thread.terminate(forceTerminateShared);
    }

    /**
     * Terminate all threads in the pool.
     * 
     * Waits for all tasks in all threads to settle. If tasks resolving is required, call
     * {@link EsThreadPool#resolved} before calling {@link EsThreadPool#terminate}.
     * 
     * @param forceTerminateShared - If you want to make sure SharedWorkers abort.
     * Probably not a great idea, but one might want to do it.
     */
    public async terminate(forceTerminateShared?: boolean): Promise<void> {
        const terminatePromises: Promise<void>[] = [];
        for (const [idx, thread] of this.threads.entries()) {
            terminatePromises.push(this.doTerminate(idx, thread, forceTerminateShared));
        }

        await Promise.all(terminatePromises);
    }
}
