import { assertMessageEvent,
    ControllerMessage,
    isControllerJobRunMessage,
    WorkerInitMessage,
    WorkerMessageType,
    WorkerUncaughtErrorMessage,
    WorkerJobResultMessage,
    WorkerJobErrorMessage } from "../shared/messages";
import { WorkerFunction, WorkerModule } from "../shared/Worker";
import { isTransferDescriptor } from "../shared/TransferDescriptor";


type WorkerScope = (DedicatedWorkerGlobalScope | SharedWorkerGlobalScope) & typeof globalThis;

function assertWorkerRuntime(context: any): asserts context is WorkerScope {
    if(!(context instanceof DedicatedWorkerGlobalScope || context instanceof SharedWorkerGlobalScope)) {
        throw new Error("Not in a WebWorker");
    }
}

function isDedicatedWorkerRuntime(context: WorkerScope): context is DedicatedWorkerGlobalScope & typeof globalThis {
    return context instanceof DedicatedWorkerGlobalScope;
}

type WorkerContext = WorkerGlobalScope & typeof globalThis | MessagePort;

function subscribeToControllerMessages(context: WorkerContext, handler: (ev: ControllerMessage) => void) {
    const messageHandler = (event: Event) => {
        assertMessageEvent(event);
        handler(event.data);
    }

    const unsubscribe = () => {
        context.removeEventListener("message", messageHandler);
    }

    context.addEventListener("message", messageHandler);
    return unsubscribe;
}

function postModuleInitMessage(context: WorkerContext, methodNames: string[]) {
    const initMsg: WorkerInitMessage = {
        type: WorkerMessageType.Init,
        methodNames: methodNames
    }
    context.postMessage(initMsg);
}

function postUncaughtErrorMessage(context: WorkerContext, error: Error) {
    try {
        const errorMessage: WorkerUncaughtErrorMessage = {
            type: WorkerMessageType.UnchaughtError,
            errorMessage: error.message
        };
        context.postMessage(errorMessage);
    } catch (subError) {
        console.error(
            "Not reporting uncaught error back to master thread as it " +
            "occured while reporting an uncaught error already." +
            "\nLatest error:", subError,
            "\nOriginal error:", error
        )
    }
}

function prepareResult<Result extends any>(rawResult: Result): {result: Result, transferables: Transferable[]} {
    const transferables: Transferable[] = [];

    if(isTransferDescriptor(rawResult)) {
        return {result: rawResult.send, transferables: rawResult.transferables}
    }
    else {
        return {result: rawResult, transferables: []}
    }
}

function postWorkerJobResultMessage(context: WorkerContext, jobUid: number, rawResult: any) {
    const {result, transferables} = prepareResult(rawResult);

    const resultMessage: WorkerJobResultMessage = {
        type: WorkerMessageType.JobResult,
        uid: jobUid,
        result: result
    };

    context.postMessage(resultMessage, transferables);
}

function postWorkerJobErrorMessage(context: WorkerContext, jobUid: number, error: Error) {
    const resultMessage: WorkerJobErrorMessage = {
        type: WorkerMessageType.JobError,
        uid: jobUid,
        errorMessage: error.message
    };
    context.postMessage(resultMessage);
}

async function runFunction(context: WorkerContext, jobUid: number, fn: WorkerFunction, args: any[]) {
    try {
        const res = fn(...args);

        if (res instanceof Promise) await res;

        postWorkerJobResultMessage(context, jobUid, res);
    } catch (error) {
        postWorkerJobErrorMessage(context, jobUid, error as Error);
    }
}

var workerApiExposed = false;

export function exposeApi(api: WorkerModule<any>) {
    const workerScope = self;
    assertWorkerRuntime(workerScope);

    if (workerApiExposed) throw Error("exposeApi() should only be called once.");
    workerApiExposed = true;

    const exposeApiInner = (context: WorkerContext) => {
        if (typeof api === "object" && api) {
            subscribeToControllerMessages(context, messageData => {
                if (isControllerJobRunMessage(messageData) && messageData.method) {
                    runFunction(context, messageData.uid, api[messageData.method], messageData.args)
                }
            })
        
            const methodNames = Object.keys(api).filter(key => typeof api[key] === "function");
            postModuleInitMessage(context, methodNames)
        } else {
            throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${api}`)
        }
    
        /*Implementation.subscribeToControllerMessages(messageData => {
            if (isMasterJobCancelMessage(messageData)) {
                const jobUID = messageData.uid
                const subscription = activeSubscriptions.get(jobUID)
        
                if (subscription) {
                subscription.unsubscribe()
                activeSubscriptions.delete(jobUID)
                }
            }
        })*/
    }

    if(isDedicatedWorkerRuntime(workerScope)) exposeApiInner(workerScope);
    else {
        globalThis.onconnect = (event) => {
            const port = event.ports[0];
            port.start();
            exposeApiInner(port);
        }
    }

    // Register error handlers
    workerScope.addEventListener("error", event => {
        // Post with some delay, so the master had some time to subscribe to messages
        setTimeout(() => postUncaughtErrorMessage(workerScope, event.error || event), 250)
    });

    workerScope.addEventListener("unhandledrejection", event => {
        const error = (event as any).reason
        if (error && typeof (error as any).message === "string") {
            // Post with some delay, so the master had some time to subscribe to messages
            setTimeout(() => postUncaughtErrorMessage(workerScope, error), 250)
        }
    });
}

