import { WorkerModule } from "../../shared/Worker"
import { EsThreadProxy } from "../thread/EsThread"

export const defaultPoolSize = typeof navigator !== "undefined" && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency : 4;

export interface EsPoolOptions {
    /** Maximum no. of tasks to run on one worker thread at a time. Defaults to one. */
    concurrency?: number

    /** Gives that pool a name to be used for debug logging, letting you distinguish between log output of different pools. */
    name?: string

    /** No. of worker threads to spawn and to be managed by the pool. */
    size?: number
}


export class EsWorkerPool<ApiType extends WorkerModule<any>> {
    private workers: Promise<EsThreadProxy<ApiType>>[];
    readonly size: number;
    readonly name: string;
    readonly concurrency: number;

    constructor(spawnThread: () => Promise<EsThreadProxy<ApiType>>, poolOptions?: EsPoolOptions) {
        const options = poolOptions ? poolOptions : {};
        this.size = options.size || defaultPoolSize;
        this.name = options.name || "EsWorkerPool";
        this.concurrency = options.concurrency || 1;

        this.workers = EsWorkerPool.spawnThreads(spawnThread, this.size);

        // TODO:
        /*Promise.all(this.workers).then(
            () => this.eventSubject.next({
                type: PoolEventType.initialized,
                size: this.workers.length
            }),
            error => {
                this.debug("Error while initializing pool worker:", error)
                this.eventSubject.error(error)
                this.initErrors.push(error)
            }
        )*/
    }

    private static spawnThreads<ApiType extends WorkerModule<any>>(
        spawnThread: () => Promise<EsThreadProxy<ApiType>>,
        count: number
    ): Promise<EsThreadProxy<ApiType>>[] {
        return [...Array(count).keys()].map(() => spawnThread());
    }

    public async queue<Return>(taskFunction: (worker: EsThreadProxy<ApiType>) => Promise<Return>) {
        return taskFunction(await this.workers[0])
    }

    public async terminate() {
        // TODO: wait for finished tasks and whatever
        for await (const worker of this.workers) {
            worker.terminate();
        }
    }
}
