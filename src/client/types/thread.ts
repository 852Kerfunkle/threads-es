export type ThreadFunction = ((...args: any[]) => any) | (() => any);

export type ThreadModule<Keys extends string> = {
    [key in Keys]: ThreadFunction;
}