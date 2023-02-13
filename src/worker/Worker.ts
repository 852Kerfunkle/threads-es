import { ControllerMessage,
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
    isSharedWorkerScope,
    WorkerContext } from "./Utils";


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
// Assume WorkerGlobalScope, to avoid some type weirdness.
const workerScope = self as WorkerGlobalScope;

// Register error handlers for DedicatedWorker.
if(isDedicatedWorkerScope(workerScope)) {
    // For some reason onerror and onunhandledrejection don't work in
    // DedicatedWorkerGlobalScope (on chrome, at least), so use addEventListener.
    workerScope.addEventListener("error", event => {
        event.preventDefault();
        // TODO: Post with some delay, so the master had some time to subscribe to messages?
        //setTimeout(() =>
            postUncaughtErrorMessage(workerScope, event.error || event);
            //, 250);
    });

    workerScope.addEventListener("unhandledrejection", event => {
        event.preventDefault();
        const error = (event as PromiseRejectionEvent).reason;
        // TODO: Post with some delay, so the master had some time to subscribe to messages?
        //setTimeout(() =>
            postUncaughtErrorMessage(workerScope, error || event)
            //, 250);
    });
}

/**
 * Expose an API implementation to the controller.
 * 
 * @param api - The API implementation to expose.
 * 
 * @example
 * An example
 * ```ts
 * export type ExampleAPI = {
 *     workOnArray(array: TransferDescriptor<ArrayBuffer>): TransferDescriptor<ArrayBuffer>;
 * }
 * 
 * const exampleImpl: ExampleAPI = {
 *     workOnArray: (array: TransferDescriptor<ArrayBuffer>): TransferDescriptor<ArrayBuffer> => {
 *         const uint8 = new Uint8Array(array.send);
 *         // do something
 *         return Transfer(uint8.buffer);
 *     }
 * }
 * 
 * exposeApi(exampleImpl);
 * ```
 */
export function exposeApi(api: WorkerModule) {
    assertWorkerScope(workerScope);

    if (workerApiExposed) throw new Error("exposeApi() should only be called once.");
    workerApiExposed = true;

    const exposeApiInner = (context: WorkerContext) => {
        if (typeof api === "object" && api) {
            // Set message handler on worker context.
            context.onmessage = (event) => {
                // We can assume the target of the message to be the current worker context.
                const eventContext = event.currentTarget as WorkerContext;
                const messageData: ControllerMessage = event.data;
                switch(messageData.type) {
                    case ControllerMessageType.Run:
                        runFunction(eventContext, messageData.uid, api[messageData.method], messageData.args);
                        break;

                    case ControllerMessageType.Terminate:
                        // If it's a shared worker context, close the port.
                        // If it's a dedicated worker context, abort the worker.
                        eventContext.close();

                        // If SharedWorker and forceTerminateShared is set, abort SharedWorker.
                        if(isSharedWorkerScope(workerScope)
                            && messageData.forceTerminateShared) {
                            workerScope.close();
                        }
                        break;

                    // TODO: default:
                    // throw new Error()....
                }
            }

            // If context is SharedWorker port, start port.
            if(context instanceof MessagePort) context.start();

            // Sent init message to client.
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

            // Register error handlers for SharedWorker on connect.
            // Assign to onerror and onunhandledrejection, otherwise ports are not GCd (in chrome),
            // when a client terminated without sending a terminate message (no chance to remove event listener).
            // Only the last connected client will recieve error messages.
            //
            // This also means some of these events will be swallowed until a client connects.
            // Could maybe have a global queue of errors that is emptied and sent when a client connects.
            workerScope.onerror = event => {
                event.preventDefault();
                // TODO: Post with some delay, so the master had some time to subscribe to messages?
                //setTimeout(() =>
                    postUncaughtErrorMessage(port, event.error || event);
                    //, 250);
            };
        
            workerScope.onunhandledrejection = event => {
                event.preventDefault();
                const error = (event as PromiseRejectionEvent).reason;
                // TODO: Post with some delay, so the master had some time to subscribe to messages?
                //setTimeout(() =>
                    postUncaughtErrorMessage(port, error || event)
                    //, 250);
            };

            exposeApiInner(port);
        }
    }
}

