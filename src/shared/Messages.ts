export type TaskUID = string;

/**
 * Messages client -> thread
 */
export enum ControllerMessageType {
    Run = 0,
    Cancel,
    Terminate,
}

export interface ControllerMessage {
    type: ControllerMessageType;
}

export interface ControllerTaskRunMessage extends ControllerMessage {
    uid: TaskUID;
    method: string;
    args: any[];
}

/*export interface ControllerTaskCancelMessage extends ControllerMessage {
    uid: TaskUID;
}*/

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ControllerTerminateMessage extends ControllerMessage { }

//export const isControllerTaskCancelMessage = (thing: ControllerMessage): thing is ControllerTaskCancelMessage => thing && thing.type === ControllerMessageType.Cancel
export const isControllerTaskRunMessage = (thing: ControllerMessage): thing is ControllerTaskRunMessage => thing && thing.type === ControllerMessageType.Run
export const isControllerTerminateMessage = (thing: ControllerMessage): thing is ControllerTerminateMessage => thing && thing.type === ControllerMessageType.Terminate

/**
 * Messages thread -> client
 */
export enum WorkerMessageType {
    Init = 0,
    UnchaughtError,
    TaskError,
    TaskResult
}

export interface WorkerMessage {
    type: WorkerMessageType;
}

export interface WorkerInitMessage extends WorkerMessage {
    methodNames: string[]
}

export interface WorkerUncaughtErrorMessage extends WorkerMessage {
    errorMessage: string
}

export interface WorkerTaskErrorMessage extends WorkerMessage {
    uid: TaskUID;
    errorMessage: string;
}

export interface WorkerTaskResultMessage extends WorkerMessage {
    uid: TaskUID;
    result: any;
}

export const isWorkerInitMessage = (thing: WorkerMessage): thing is WorkerInitMessage => thing && thing.type === WorkerMessageType.Init;
export const isWorkerUncaughtErrorMessage = (thing: WorkerMessage): thing is WorkerUncaughtErrorMessage => thing && thing.type === WorkerMessageType.UnchaughtError;
export const isWorkerTaskErrorMessage = (thing: WorkerMessage): thing is WorkerTaskErrorMessage => thing && thing.type === WorkerMessageType.TaskError;
export const isWorkerTaskResultMessage = (thing: WorkerMessage): thing is WorkerTaskResultMessage => thing && thing.type === WorkerMessageType.TaskResult;

/**
 * Helpers, utils
 */
export function assertMessageEvent(event: Event): asserts event is MessageEvent {
    if(!(event instanceof MessageEvent)) throw new Error("Not MessageEvent");
}