import { ThreadModule } from "../client/types/thread";

enum WorkerRuntimeType {
    Worker = 0,
    SharedWorker = 1
}

type WorkerContext = WorkerGlobalScope | SharedWorkerGlobalScope;

function assertWorkerRuntime(context: any): asserts context is WorkerContext {
    if(!(context instanceof WorkerGlobalScope || context instanceof SharedWorkerGlobalScope)) {
        throw new Error("Not in a WebWorker");
    }
}

function workerRuntimeType(context: WorkerContext): WorkerRuntimeType {
    if(typeof SharedWorkerGlobalScope !== "undefined" && context instanceof SharedWorkerGlobalScope)
        return WorkerRuntimeType.SharedWorker;
    return WorkerRuntimeType.Worker;
}

var workerApiExposed = false;

export function exposeApi(api: ThreadModule<any>) {
    const workerContext = self;
    assertWorkerRuntime(workerContext);
    const runtimeType = workerRuntimeType(workerContext);

    if (workerApiExposed) throw Error("exposeApi() should only be called once.");
    workerApiExposed = true;

    const exposeApiInner = (context: WorkerContext) => {
        /*if (typeof api === "object" && api) {
            Implementation.subscribeToMasterMessages(messageData => {
                if (isMasterJobRunMessage(messageData) && messageData.method) {
                    runFunction(messageData.uid, exposed[messageData.method], messageData.args.map(deserialize))
                }
            })
        
            const methodNames = Object.keys(exposed).filter(key => typeof exposed[key] === "function")
            postModuleInitMessage(methodNames)
        } else {
            throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${api}`)
        }
    
        Implementation.subscribeToMasterMessages(messageData => {
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

    if(runtimeType === WorkerRuntimeType.Worker) exposeApiInner(workerContext);
    else {
        globalThis.onconnect = (event) => {
            const port = event.ports[0];
            port.start();

            exposeApiInner(workerContext)
        }
    }
}