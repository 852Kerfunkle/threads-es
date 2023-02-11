export type WorkerFunction = ((...args: any[]) => any) | (() => any);

export interface WorkerModule {
    [methodName: string]: WorkerFunction
}

export interface Terminable {
    terminate(): Promise<void>;
    settled(): Promise<void>;
    resolved(): Promise<void>;
}