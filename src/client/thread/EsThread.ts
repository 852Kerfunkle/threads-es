import { assertMessageEvent, ClientJobRunMessage, ClientMessageType, isThreadInitMessage, isThreadJobErrorMessage, isThreadJobResultMessage, isThreadUncaughtErrorMessage, ThreadInitMessage } from "../../shared/messages";
import { ThreadModule } from "../../shared/thread";
import { isTransferDescriptor, TransferDescriptor } from "../../shared/TransferDescriptor";
import { EsWorkerInterface } from "../workers/EsWorkerInterface";

var nextJobUID = 0;

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

function prepareArguments(rawArgs: any[]): {args: any[], transferables: Transferable[]} {
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

function createProxyFunction<Args extends any[], ReturnType>(thread: EsThread, method: string) {
    return ((...rawArgs: Args) => {
        const uid = nextJobUID++;
        const { args, transferables } = prepareArguments(rawArgs);
        const runMessage: ClientJobRunMessage = {
            type: ClientMessageType.Run,
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
                assertMessageEvent(evt);
                
                if(isThreadJobResultMessage(evt.data) && evt.data.uid === uid) {
                    thread.worker.removeEventListener("message", recieve);
                    resolve(evt.data.result as ReturnType);
                }
                
                if(isThreadJobErrorMessage(evt.data) && evt.data.uid === uid) {
                    thread.worker.removeEventListener("message", recieve);
                    reject(new Error(evt.data.errorMessage));
                }
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
        proxy[methodName] = createProxyFunction(thread, methodName);
    }

    return proxy as EsThreadProxy<ApiType>;
}

function receiveInitMessage(worker: EsWorkerInterface): Promise<ThreadInitMessage> {
    return new Promise((resolve, reject) => {
        const messageHandler = (event: Event) => {
            assertMessageEvent(event);
            if (isThreadInitMessage(event.data)) {
                worker.removeEventListener("message", messageHandler);
                resolve(event.data);
            }
            else if (isThreadUncaughtErrorMessage(event.data)) {
                worker.removeEventListener("message", messageHandler);
                reject(event.data.errorMessage);
            }
        };
        worker.addEventListener("message", messageHandler)
    })
}

export async function spawn<ApiType extends ThreadModule<any>>(worker: EsWorkerInterface)
    : Promise<EsThreadProxy<ApiType>> {

    // TODO: wait for a short while to make sure we fail if the thread does not start
    const exposedApi = await receiveInitMessage(worker);

    // Create our thread and inject it with the functions.
    const thread = new EsThread(worker);
    return createProxyModule<ApiType>(thread, exposedApi.methodNames);
}