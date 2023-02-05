import { WorkerJobRunMessage, WorkerMessageType } from "../types/messages";
import { ThreadModule } from "../types/thread";
import { EsWorker } from "../workers";
import { EsWorkerInterface } from "../workers/EsWorkerInterface";

var nextJobUID = 0;

export interface TransferDescriptor<T = any> {
    transferable: true
    send: T
    transferables: Transferable[]
}

export type StripTransfer<Type> =
    Type extends TransferDescriptor<infer BaseType>
    ? BaseType
    : Type

export type ProxyableArgs<Args extends any[]> = Args extends [arg0: infer Arg0, ...rest: infer RestArgs]
    ? [Arg0 extends Transferable ? Arg0 | TransferDescriptor<Arg0> : Arg0, ...RestArgs]
    : Args

export type ProxyableFunction<Args extends any[], ReturnType> =
    Args extends []
    ? () => Promise<StripTransfer<Awaited<ReturnType>>>
    : (...args: ProxyableArgs<Args>) => Promise<StripTransfer<Awaited<ReturnType>>>

export type ModuleMethods = { [methodName: string]: (...args: any) => any }

export type ModuleProxy<Methods extends ModuleMethods> = {
    [method in keyof Methods]: ProxyableFunction<Parameters<Methods[method]>, ReturnType<Methods[method]>>
}

class EsThread {
    readonly worker: EsWorkerInterface;

    constructor(worker: EsWorkerInterface) {
        this.worker = worker;
    }
}

export type EsThreadProxy<ApiType extends ThreadModule<any>> = EsThread & ModuleProxy<ApiType>

function prepareArguments<Args extends any[]>(...rawArgs: Args): {args: Args[], transferables: Transferable[]} {
    throw new Error("not implemented")
    //return {args: [], transferables: []}
}

function createProxyFunction<Args extends any[], ReturnType>(thread: EsThread, method: string) {
    return ((...rawArgs: Args) => {
        const uid = nextJobUID++
        const { args, transferables } = prepareArguments(rawArgs)
        const runMessage: WorkerJobRunMessage = {
            type: WorkerMessageType.Run,
            uid,
            method,
            args
        }

        return new Promise<ReturnType>((resolve, reject) => {
            try {
                thread.worker.postMessage(runMessage, transferables);
            } catch (error) {
                return reject(error);
            }

            const recieve = (evt: Event) => {
                // if right event job uid
                thread.worker.removeEventListener("message", recieve);
                resolve({} as ReturnType);
            }

            thread.worker.addEventListener("message", recieve);
        })
    }) as any as ProxyableFunction<Args, ReturnType>
}

function createProxyModule<ApiType extends ThreadModule<any>>(
    thread: EsThread,
    methodNames: string[]
): EsThreadProxy<ApiType> {
    const proxy = thread as any;

    for (const methodName of methodNames) {
        proxy[methodName] = createProxyFunction(thread, methodName)
    }

    return proxy as EsThreadProxy<ApiType>;
}


export async function spawn<ApiType extends ThreadModule<any>>(worker: EsWorkerInterface)
    : Promise<EsThreadProxy<ApiType>> {

    const exposed = { messages: [] } //initMessage.exposed

    // Create our thread and inject it with the functions.
    const thread = new EsThread(worker);
    return createProxyModule<ApiType>(thread, exposed.messages);
}