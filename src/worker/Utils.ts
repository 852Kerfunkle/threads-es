export function isWorkerScope(scope: unknown): scope is WorkerGlobalScope {
    return typeof WorkerGlobalScope !== "undefined" && scope instanceof WorkerGlobalScope;
}

export function assertWorkerScope(scope: unknown): asserts scope is WorkerGlobalScope {
    if(!isWorkerScope(scope)) throw new Error("Not in a WebWorker");
}

export function isDedicatedWorkerScope(scope: unknown): scope is DedicatedWorkerGlobalScope {
    return typeof DedicatedWorkerGlobalScope !== "undefined" && scope instanceof DedicatedWorkerGlobalScope;
}

export function isSharedWorkerScope(scope: unknown): scope is SharedWorkerGlobalScope {
    return typeof SharedWorkerGlobalScope !== "undefined" && scope instanceof SharedWorkerGlobalScope;
}

export function assertSharedWorkerScope(scope: unknown): asserts scope is SharedWorkerGlobalScope {
    if(!isSharedWorkerScope(scope)) throw new Error("Not in a shared web worker");
}

export type WorkerContext = DedicatedWorkerGlobalScope | MessagePort;

export function isSharedWorkerContext(context: WorkerContext): context is MessagePort {
    return context instanceof MessagePort;
}