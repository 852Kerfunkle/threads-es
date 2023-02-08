import { assertMessageEvent,
    ControllerTaskRunMessage,
    ControllerMessageType,
    ControllerTerminateMessage,
    isWorkerInitMessage,
    isWorkerTaskErrorMessage,
    isWorkerTaskResultMessage,
    isWorkerUncaughtErrorMessage,
    WorkerInitMessage,
    TaskUID } from "../../shared/Messages";
import { Terminable, WorkerModule } from "../../shared/Worker";
import { isTransferDescriptor, TransferDescriptor } from "../../shared/TransferDescriptor";
import { getRandomUID, withTimeout } from "../../shared/Utils";
import { EsTaskPromise } from "./EsTask";

type StripTransfer<Type> =
    Type extends TransferDescriptor<infer BaseType>
    ? BaseType
    : Type

type ProxyFunction<Args extends any[], ReturnType> =
    (...args: Args) => Promise<StripTransfer<Awaited<ReturnType>>>

type ProxyModule<ApiType extends WorkerModule> = {
    [method in keyof ApiType]: ProxyFunction<Parameters<ApiType[method]>, ReturnType<ApiType[method]>>
}

type WorkerType = Worker | SharedWorker;

interface WorkerInterface {
    postMessage(message: any, transfer: Transferable[]): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

export interface EsThreadOptions {
    // If the thread doesn't send the init message within timeout, it rejects.
    timeout?: number;
}

const defaultThreadTimeout = 10000;

export class EsThread<ApiType extends WorkerModule> implements Terminable {
    readonly tasks: Map<TaskUID, EsTaskPromise<any>> = new Map();
    readonly threadUID = getRandomUID();
    readonly options: Required<EsThreadOptions>;

    private worker: WorkerType;
    private interface: WorkerInterface;

    public methods: ProxyModule<ApiType> = {} as ProxyModule<ApiType>;
    public get numQueuedTasks() { return this.tasks.size; }

    private constructor(worker: WorkerType, threadOptions: EsThreadOptions) {
        this.worker = worker;
        if(worker instanceof Worker) this.interface = worker;
        else {
            this.interface = worker.port;
            worker.port.start();
        }

        this.options = {
            timeout: threadOptions.timeout || defaultThreadTimeout
        }
    }

    public static async Spawn<ApiType extends WorkerModule>(worker: WorkerType, threadOptions: EsThreadOptions = {}) {
        const thread = new EsThread<ApiType>(worker, threadOptions);
        return thread.initThread();
    }

    public async settled(): Promise<void> {
        await Promise.allSettled(this.tasks.values());
    }

    public async terminate(): Promise<void> {
        // Don't terminate until all tasks are done.
        await this.settled();

        // Send terminate message to worker.
        const terminateMessage: ControllerTerminateMessage = {
            type: ControllerMessageType.Terminate };
        this.interface.postMessage(terminateMessage, []);

        this.interface.removeEventListener("message", this.taskResultDispatch);

        if(this.worker instanceof Worker) this.worker.terminate();
    }

    private taskResultDispatch = (evt: Event) => {
        try {
            assertMessageEvent(evt);

            if(isWorkerTaskResultMessage(evt.data)) {
                const task = this.tasks.get(evt.data.uid);
                if(!task) throw new Error("Recived result for invalid task with UID " + evt.data.uid);
                this.tasks.delete(task.taskUID);
                task.resolve(evt.data.result);
            }
            else if(isWorkerTaskErrorMessage(evt.data)) {
                const task = this.tasks.get(evt.data.uid);
                if(!task) throw new Error("Recived error for invalid task with UID " + evt.data.uid);
                this.tasks.delete(task.taskUID);
                task.reject(new Error(evt.data.errorMessage));
            }
            else if(isWorkerUncaughtErrorMessage(evt.data)) {
                throw new Error("Uncaught error in worker: " + evt.data.errorMessage);
            }

            // TODO: handle other event types?
        }
        catch(e) {
            console.error(e);
        }
    }

    private static prepareArguments(rawArgs: any[]): {args: any[], transferables: Transferable[]} {
        const args: any[] = [];
        const transferables: Transferable[] = [];
        for(const arg of rawArgs) {
            if(isTransferDescriptor(arg)) {
                transferables.push(...arg.transferables)
                args.push(arg);
            }
            else {
                args.push(arg);
            }
        }
    
        return {args: args, transferables: transferables}
    }

    private createProxyFunction<Args extends any[], ReturnType>(method: string) {
        return ((...rawArgs: Args): Promise<ReturnType> => {
            const taskPromise = EsTaskPromise.Create<ReturnType>();
            const { args, transferables } = EsThread.prepareArguments(rawArgs);
            const runMessage: ControllerTaskRunMessage = {
                type: ControllerMessageType.Run,
                uid: taskPromise.taskUID,
                method: method,
                args: args };

            this.tasks.set(taskPromise.taskUID, taskPromise);
            this.interface.postMessage(runMessage, transferables);

            return taskPromise;
        }) as ProxyFunction<Args, ReturnType>;
    }

    private createMethodsProxy(
        methodNames: string[])
    {
        const proxy = this.methods as any;
    
        for (const methodName of methodNames) {
            proxy[methodName] = this.createProxyFunction(methodName);
        }
    }

    private async initThread() {
        let exposedApi;
        try {
            exposedApi = await withTimeout(new Promise<WorkerInitMessage>((resolve, reject) => {
                const initMessageHandler = (event: Event) => {
                    assertMessageEvent(event);
                    if (isWorkerInitMessage(event.data)) {
                        this.interface.removeEventListener("message", initMessageHandler);
                        resolve(event.data);
                    }
                    else if (isWorkerUncaughtErrorMessage(event.data)) {
                        this.interface.removeEventListener("message", initMessageHandler);
                        reject(new Error(event.data.errorMessage));
                    }
                };
                this.interface.addEventListener("message", initMessageHandler)
            }), this.options.timeout, `Timeout: Did not receive an init message from worker after ${this.options.timeout}ms`);
        }
        catch(e) {
            // If init times out, terminate worker, or close the message port.
            if(this.worker instanceof Worker) this.worker.terminate();
            else if(this.worker instanceof SharedWorker) this.worker.port.close();
            throw e;
        }

        this.createMethodsProxy(exposedApi.methodNames);

        this.interface.addEventListener("message", this.taskResultDispatch);

        return this;
    }
}