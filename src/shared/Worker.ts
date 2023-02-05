export type WorkerFunction = ((...args: any[]) => any) | (() => any);

export type WorkerModule<Keys extends string> = {
    [key in Keys]: WorkerFunction;
}