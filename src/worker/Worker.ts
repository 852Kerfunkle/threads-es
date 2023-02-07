import { assertMessageEvent,
    ControllerMessage,
    isControllerJobRunMessage,
    isControllerTerminateMessage,
    WorkerInitMessage,
    WorkerMessageType,
    WorkerUncaughtErrorMessage,
    WorkerJobResultMessage,
    WorkerJobErrorMessage, 
    TaskUID} from "../shared/Messages";
import { WorkerFunction, WorkerModule } from "../shared/Worker";
import { isTransferDescriptor } from "../shared/TransferDescriptor";
import { assertSharedWorkerScope,
    assertWorkerScope,
    isDedicatedWorkerScope,
    isWorkerScope,
    WorkerContext } from "./Utils";


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
        methodNames: methodNames };
    context.postMessage(initMsg);
}

function postUncaughtErrorMessage(context: WorkerContext, error: Error) {
    try {
        const errorMessage: WorkerUncaughtErrorMessage = {
            type: WorkerMessageType.UnchaughtError,
            errorMessage: error.message };
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

    const taskResultMessage: WorkerJobResultMessage = {
        type: WorkerMessageType.JobResult,
        uid: jobUid,
        result: result };
    context.postMessage(taskResultMessage, transferables);
}

function postWorkerJobErrorMessage(context: WorkerContext, jobUid: TaskUID, error: Error) {
    const taskErrorMessage: WorkerJobErrorMessage = {
        type: WorkerMessageType.JobError,
        uid: jobUid,
        errorMessage: error.message };
    context.postMessage(taskErrorMessage);
}

async function runFunction(context: WorkerContext, jobUid: TaskUID, fn: WorkerFunction, args: any[]) {
    try {
        let res = fn(...args);
        if (res instanceof Promise) res = await res;
        postWorkerJobResultMessage(context, jobUid, res);
    } catch (error) {
        postWorkerJobErrorMessage(context, jobUid, error as Error);
    }
}

let workerApiExposed = false;
const workerScope = self;

// Register error handlers
if(isWorkerScope(workerScope)) {
    // TODO: this doesn't work for SharedWorker.
    // if an error is thrown before the onconnect handler in the
    // SharedWorker is called, there is nowhere to post to. Could/should move
    // these into the onconnect handler if it's a SharedWorker.
    workerScope.addEventListener("error", event => {
        // Post with some delay, so the master had some time to subscribe to messages
        event.preventDefault();
        setTimeout(() => postUncaughtErrorMessage(workerScope, event.error || event), 250);
    });

    workerScope.addEventListener("unhandledrejection", event => {
        event.preventDefault();
        const error = (event as PromiseRejectionEvent).reason
        setTimeout(() => postUncaughtErrorMessage(workerScope, error || event), 250);
    });
}

export function exposeApi(api: WorkerModule<any>) {
    assertWorkerScope(workerScope);

    if (workerApiExposed) throw new Error("exposeApi() should only be called once.");
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
                    // If it's a shared worker context, close the port.
                    // If it's a dedicated worker context, abort the worker.
                    context.close();
                    // TODO: when all clients to a shared worker terminated,
                    // use workerScope.close() to terminate shared worker?
                }
            })

            const methodNames = Object.keys(api).filter(key => typeof api[key] === "function");
            postModuleInitMessage(context, methodNames)
        } else {
            throw new Error(`Invalid argument passed to exposeApi(). Expected an object, got: ${api}`)
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

