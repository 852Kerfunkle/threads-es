import { assertMessageEvent,
    ControllerMessage,
    isControllerJobRunMessage,
    isControllerTerminateMessage,
    WorkerInitMessage,
    WorkerMessageType,
    WorkerUncaughtErrorMessage,
    WorkerJobResultMessage,
    WorkerJobErrorMessage, 
    TaskUID} from "../shared/messages";
import { WorkerFunction, WorkerModule } from "../shared/Worker";
import { isTransferDescriptor } from "../shared/TransferDescriptor";
import { assertSharedWorkerScope, assertWorkerScope, isDedicatedWorkerScope, isSharedWorkerContext, isWorkerScope, WorkerContext } from "./Utils";


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

function prepareResult<Result>(rawResult: Result): {result: Result, transferables: Transferable[]} {
    if(isTransferDescriptor(rawResult)) {
        return {result: rawResult.send, transferables: rawResult.transferables}
    }
    else {
        return {result: rawResult, transferables: []}
    }
}

function postWorkerJobResultMessage(context: WorkerContext, jobUid: TaskUID, rawResult: any) {
    const {result, transferables} = prepareResult(rawResult);

    const resultMessage: WorkerJobResultMessage = {
        type: WorkerMessageType.JobResult,
        uid: jobUid,
        result: result
    };

    context.postMessage(resultMessage, transferables);
}

function postWorkerJobErrorMessage(context: WorkerContext, jobUid: TaskUID, error: Error) {
    const resultMessage: WorkerJobErrorMessage = {
        type: WorkerMessageType.JobError,
        uid: jobUid,
        errorMessage: error.message
    };
    context.postMessage(resultMessage);
}

async function runFunction(context: WorkerContext, jobUid: TaskUID, fn: WorkerFunction, args: any[]) {
    try {
        const res = fn(...args);

        if (res instanceof Promise) {
            postWorkerJobResultMessage(context, jobUid, await res);
        }
        else {
            postWorkerJobResultMessage(context, jobUid, res);
        }
    } catch (error) {
        postWorkerJobErrorMessage(context, jobUid, error as Error);
    }
}

let workerApiExposed = false;
const workerScope = self;

// Register error handlers
if(isWorkerScope(workerScope)) {
    workerScope.addEventListener("error", event => {
        // Post with some delay, so the master had some time to subscribe to messages
        setTimeout(() => postUncaughtErrorMessage(workerScope, event.error || event), 250)
    });

    workerScope.addEventListener("unhandledrejection", event => {
        // TODO: figure out what's going on here.
        const error = (event as any).reason
        if (error && typeof (error as any).message === "string") {
            // Post with some delay, so the master had some time to subscribe to messages
            setTimeout(() => postUncaughtErrorMessage(workerScope, error), 250)
        }
    });
}

export function exposeApi(api: WorkerModule<any>) {
    assertWorkerScope(workerScope);

    if (workerApiExposed) throw Error("exposeApi() should only be called once.");
    workerApiExposed = true;

    const exposeApiInner = (context: WorkerContext) => {
        if (typeof api === "object" && api) {
            const unsubscribe = subscribeToControllerMessages(context, messageData => {
                if(isControllerJobRunMessage(messageData)) {
                    runFunction(context, messageData.uid, api[messageData.method], messageData.args);
                }
                
                if(isControllerTerminateMessage(messageData)) {
                    // Unsubscribe from message events on this context.
                    unsubscribe();
                    // And if it's a shared worker context, close the port.
                    if(isSharedWorkerContext(context)) context.close();
                }
            })
        
            const methodNames = Object.keys(api).filter(key => typeof api[key] === "function");
            postModuleInitMessage(context, methodNames)
        } else {
            throw Error(`Invalid argument passed to exposeApi(). Expected an object, got: ${api}`)
        }

        // TODO: cancelling of pending (i.e. not yet started) jobs.
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

    if(isDedicatedWorkerScope(workerScope)) exposeApiInner(workerScope);
    else {
        assertSharedWorkerScope(workerScope);
        workerScope.onconnect = (event) => {
            const port = event.ports[0];
            port.start();
            exposeApiInner(port);
        }
    }
}
