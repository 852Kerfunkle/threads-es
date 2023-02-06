import { assertMessageEvent,
    ControllerJobRunMessage,
    ControllerMessageType,
    ControllerTerminateMessage,
    isWorkerInitMessage,
    isWorkerJobErrorMessage,
    isWorkerJobResultMessage,
    isWorkerUncaughtErrorMessage,
    WorkerInitMessage,
    TaskUID } from "../../shared/messages";
import { WorkerModule } from "../../shared/Worker";
import { isTransferDescriptor, TransferDescriptor } from "../../shared/TransferDescriptor";
import { getRandomUID } from "../../shared/Utils";
import { createTaskWithPromise, EsTask } from "./EsTask";

type StripTransfer<Type> =
    Type extends TransferDescriptor<infer BaseType>
    ? BaseType
    : Type

type ProxyableArgs<Args extends any[]> = Args extends [arg0: infer Arg0, ...rest: infer RestArgs]
    ? [Arg0 extends Transferable ? Arg0 | TransferDescriptor<Arg0> : Arg0, ...RestArgs]
    : Args

type ProxyableFunction<Args extends any[], ReturnType> =
    Args extends []
    ? () => Promise<StripTransfer<Awaited<ReturnType>>>
    : (...args: ProxyableArgs<Args>) => Promise<StripTransfer<Awaited<ReturnType>>>

type ModuleMethods = { [methodName: string]: (...args: any) => any }

type ModuleProxy<Methods extends ModuleMethods> = {
    [method in keyof Methods]: ProxyableFunction<Parameters<Methods[method]>, ReturnType<Methods[method]>>
}

export type EsThreadProxy<ApiType extends WorkerModule<any>> = EsThread & ModuleProxy<ApiType>

type WorkerType = Worker | SharedWorker;

interface WorkerInterface {
    postMessage(message: any, transfer: Transferable[]): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

class EsThread {
    private _worker: WorkerType;
    private interface: WorkerInterface;
    readonly threadUID = getRandomUID();

    private jobs: Map<TaskUID, EsTask> = new Map();
    public get numQueuedJobs() { return this.jobs.size; }

    constructor(worker: WorkerType) {
        this._worker = worker;
        if(worker instanceof Worker) this.interface = worker;
        else {
            this.interface = worker.port;
            worker.port.start();
        }
    }

    private taskResultDispatch = (evt: Event) => {
        try {
            assertMessageEvent(evt);

            if(isWorkerJobResultMessage(evt.data) || isWorkerJobErrorMessage(evt.data)) {
                const task = this.jobs.get(evt.data.uid);
                if(!task) throw new Error("Recived result for finised task with UID " + evt.data.uid);
                if(!task.notifyResult) throw new Error("Task without notify handler: " + evt.data.uid);
                task.notifyResult(evt.data);
                this.jobs.delete(task.taskUID);
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

    public terminate() {
        // TODO: don't terminate until all jobs are done?
        // Send terminate message to worker.
        const terminateMessage: ControllerTerminateMessage = {
            type: ControllerMessageType.Terminate }
        this.interface.postMessage(terminateMessage, []);

        this.interface.removeEventListener("message", this.taskResultDispatch);

        if(this._worker instanceof Worker) this._worker.terminate();
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
        return ((...rawArgs: Args) => {
            const [task, resultPromise] = createTaskWithPromise();
            const { args, transferables } = EsThread.prepareArguments(rawArgs);
            const runMessage: ControllerJobRunMessage = {
                type: ControllerMessageType.Run,
                uid: task.taskUID,
                method: method,
                args: args
            }

            this.interface.postMessage(runMessage, transferables);
            this.jobs.set(task.taskUID, task);

            return resultPromise;
        }) as any as ProxyableFunction<Args, ReturnType>
    }

    private injectApiProxy<ApiType extends WorkerModule<any>>(
        methodNames: string[]
    ): EsThreadProxy<ApiType> {
        const proxy = this as any;
    
        for (const methodName of methodNames) {
            proxy[methodName] = this.createProxyFunction(methodName);
        }
    
        return proxy as EsThreadProxy<ApiType>;
    }

    public async initThread<ApiType extends WorkerModule<any>>()
        : Promise<EsThreadProxy<ApiType>>
    {
        // TODO: have a timeout on this, to make sure a worker failing to init doesn't
        // block execution forever.
        const exposedApi = await new Promise<WorkerInitMessage>((resolve, reject) => {
            const initMessageHandler = (event: Event) => {
                assertMessageEvent(event);
                if (isWorkerInitMessage(event.data)) {
                    this.interface.removeEventListener("message", initMessageHandler);
                    resolve(event.data);
                }
                else if (isWorkerUncaughtErrorMessage(event.data)) {
                    this.interface.removeEventListener("message", initMessageHandler);
                    reject(event.data.errorMessage);
                }
            };
            this.interface.addEventListener("message", initMessageHandler)
        });

        this.interface.addEventListener("message", this.taskResultDispatch);

        return this.injectApiProxy<ApiType>(exposedApi.methodNames);
    }
}

export async function spawn<ApiType extends WorkerModule<any>>(worker: WorkerType)
    : Promise<EsThreadProxy<ApiType>>
{
    const thread = new EsThread(worker);
    return thread.initThread();
}