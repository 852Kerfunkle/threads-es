export type WorkerScope = WorkerGlobalScope & typeof globalThis;

export function isWorkerScope(scope: any): scope is WorkerScope {
    return typeof WorkerGlobalScope !== "undefined" && scope instanceof WorkerGlobalScope;
}

export function assertWorkerScope(scope: any): asserts scope is WorkerScope {
    if(!isWorkerScope(scope)) throw new Error("Not in a WebWorker");
}

export function isDedicatedWorkerScope(scope: WorkerScope): scope is DedicatedWorkerGlobalScope & typeof globalThis {
    return typeof DedicatedWorkerGlobalScope !== "undefined" && scope instanceof DedicatedWorkerGlobalScope;
}

export function isSharedWorkerScope(scope: WorkerScope): scope is SharedWorkerGlobalScope & typeof globalThis {
    return typeof SharedWorkerGlobalScope !== "undefined" && scope instanceof SharedWorkerGlobalScope;
}

export function assertSharedWorkerScope(scope: WorkerScope): asserts scope is SharedWorkerGlobalScope & typeof globalThis {
    if(!isSharedWorkerScope(scope)) throw new Error("Not in a shared web worker");
}

export type WorkerContext = WorkerScope | MessagePort;

export function isSharedWorkerContext(context: WorkerContext): context is MessagePort {
    return context instanceof MessagePort;
}