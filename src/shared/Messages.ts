export type TaskUID = string;

new Event("bla")

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
    type: ControllerMessageType.Run;
    uid: TaskUID;
    method: string;
    args: any[];
}

/*export interface ControllerTaskCancelMessage extends ControllerMessage {
    type: ControllerMessageType.Cancel;
    uid: TaskUID;
}*/

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ControllerTerminateMessage extends ControllerMessage {
    type: ControllerMessageType.Terminate;
}

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
    type: WorkerMessageType.Init;
    methodNames: string[]
}

export interface WorkerUncaughtErrorMessage extends WorkerMessage {
    type: WorkerMessageType.UnchaughtError;
    errorMessage: string
}

export interface WorkerTaskErrorMessage extends WorkerMessage {
    type: WorkerMessageType.TaskError;
    uid: TaskUID;
    errorMessage: string;
}

export interface WorkerTaskResultMessage extends WorkerMessage {
    type: WorkerMessageType.TaskResult;
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