import { assertMessageEvent,
    ControllerJobRunMessage,
    ControllerMessageType,
    isThreadInitMessage,
    isThreadJobErrorMessage,
    isThreadJobResultMessage,
    isThreadUncaughtErrorMessage,
    ThreadInitMessage } from "../../shared/messages";
import { ThreadModule } from "../../shared/thread";
import { isTransferDescriptor, TransferDescriptor } from "../../shared/TransferDescriptor";
import { EsWorkerInterface } from "../workers/EsWorkerInterface";

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

export type EsThreadProxy<ApiType extends ThreadModule<any>> = EsThread & ModuleProxy<ApiType>

class EsThread {
    readonly worker: EsWorkerInterface;
    private nextJobUID = 0;

    constructor(worker: EsWorkerInterface) {
        this.worker = worker;
    }

    // TODO: thread should have a set of queued tasks
    // and a more efficient way to publish job done/failed events.

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
            const uid = this.nextJobUID++;
            const { args, transferables } = EsThread.prepareArguments(rawArgs);
            const runMessage: ControllerJobRunMessage = {
                type: ControllerMessageType.Run,
                uid,
                method,
                args
            }
    
            return new Promise<ReturnType>((resolve, reject) => {
                try {
                    this.worker.postMessage(runMessage, transferables);
                } catch (error) {
                    return reject(error);
                }
    
                const recieve = (evt: Event) => {
                    assertMessageEvent(evt);
                    
                    if(isThreadJobResultMessage(evt.data) && evt.data.uid === uid) {
                        this.worker.removeEventListener("message", recieve);
                        resolve(evt.data.result as ReturnType);
                    }
                    
                    if(isThreadJobErrorMessage(evt.data) && evt.data.uid === uid) {
                        this.worker.removeEventListener("message", recieve);
                        reject(new Error(evt.data.errorMessage));
                    }
                }
    
                this.worker.addEventListener("message", recieve);
            })
        }) as any as ProxyableFunction<Args, ReturnType>
    }

    private injectApiProxy<ApiType extends ThreadModule<any>>(
        methodNames: string[]
    ): EsThreadProxy<ApiType> {
        const proxy = this as any;
    
        for (const methodName of methodNames) {
            proxy[methodName] = this.createProxyFunction(methodName);
        }
    
        return proxy as EsThreadProxy<ApiType>;
    }

    public async initThread<ApiType extends ThreadModule<any>>()
        : Promise<EsThreadProxy<ApiType>>
    {
        const exposedApi = await new Promise<ThreadInitMessage>((resolve, reject) => {
            const initMessageHandler = (event: Event) => {
                assertMessageEvent(event);
                if (isThreadInitMessage(event.data)) {
                    this.worker.removeEventListener("message", initMessageHandler);
                    resolve(event.data);
                }
                else if (isThreadUncaughtErrorMessage(event.data)) {
                    this.worker.removeEventListener("message", initMessageHandler);
                    reject(event.data.errorMessage);
                }
            };
            this.worker.addEventListener("message", initMessageHandler)
        })

        return this.injectApiProxy<ApiType>(exposedApi.methodNames);
    }
}

export async function spawn<ApiType extends ThreadModule<any>>(worker: EsWorkerInterface)
    : Promise<EsThreadProxy<ApiType>>
{
    const thread = new EsThread(worker);
    return thread.initThread();
}