import { assertMessageEvent,
    ControllerMessage,
    ControllerMessageType,
    WorkerInitMessage,
    WorkerMessageType,
    WorkerUncaughtErrorMessage,
    WorkerTaskResultMessage,
    WorkerTaskErrorMessage, 
    TaskUID } from "../shared/Messages";
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

function postWorkerTaskResultMessage(context: WorkerContext, taskUid: TaskUID, rawResult: any) {
    const {result, transferables} = prepareResult(rawResult);

    const taskResultMessage: WorkerTaskResultMessage = {
        type: WorkerMessageType.TaskResult,
        uid: taskUid,
        result: result };
    context.postMessage(taskResultMessage, transferables);
}

function postWorkerTaskErrorMessage(context: WorkerContext, taskUid: TaskUID, error: Error) {
    const taskErrorMessage: WorkerTaskErrorMessage = {
        type: WorkerMessageType.TaskError,
        uid: taskUid,
        errorMessage: error.message };
    context.postMessage(taskErrorMessage);
}

async function runFunction(context: WorkerContext, taskUid: TaskUID, fn: WorkerFunction, args: any[]) {
    try {
        let res = fn(...args);
        if (res instanceof Promise) res = await res;
        postWorkerTaskResultMessage(context, taskUid, res);
    } catch (error) {
        postWorkerTaskErrorMessage(context, taskUid, error as Error);
    }
}

let workerApiExposed = false;
const workerScope = self;
// connectedClients is only used for SharedWorker.
const connectedClients = new Set<MessagePort>();

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

export function exposeApi(api: WorkerModule) {
    assertWorkerScope(workerScope);

    if (workerApiExposed) throw new Error("exposeApi() should only be called once.");
    workerApiExposed = true;

    const exposeApiInner = (context: WorkerContext) => {
        if (typeof api === "object" && api) {
            const unsubscribe = subscribeToControllerMessages(context, messageData => {
                switch(messageData.type) {
                    case ControllerMessageType.Run:
                        runFunction(context, messageData.uid, api[messageData.method], messageData.args);
                        break;

                    case ControllerMessageType.Terminate:
                        // Unsubscribe from message events on this context.
                        unsubscribe();
                        // If it's a shared worker context, close the port.
                        // If it's a dedicated worker context, abort the worker.
                        if(context instanceof MessagePort) connectedClients.delete(context);
                        context.close();

                        // When all clients to a shared worker terminated,
                        // use workerScope.close() to terminate shared worker.
                        if(connectedClients.size === 0) workerScope.close();
                        break;

                    // TODO: default:
                    // throw new Error()....
                }
            })

            const methodNames = Object.keys(api).filter(key => typeof api[key] === "function");
            postModuleInitMessage(context, methodNames)
        } else {
            throw new Error(`Invalid argument passed to exposeApi(). Expected an object, got: ${api}`)
        }

        // TODO: cancelling of pending (i.e. not yet started) tasks.
        /*Implementation.subscribeToControllerMessages(messageData => {
            if (isMasterTaskCancelMessage(messageData)) {
                const taskUID = messageData.uid
                const subscription = activeSubscriptions.get(taskUID)
        
                if (subscription) {
                subscription.unsubscribe()
                activeSubscriptions.delete(taskUID)
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
            connectedClients.add(port);
            exposeApiInner(port);
        }
    }
}

