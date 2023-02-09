export type TaskUID = string;

/**
 * Messages client -> thread
 */
export enum ControllerMessageType {
    Run = 0,
    Cancel,
    Terminate,
}

export interface ControllerTaskRunMessage {
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
export interface ControllerTerminateMessage {
    type: ControllerMessageType.Terminate;
}

export type ControllerMessage = ControllerTaskRunMessage | ControllerTerminateMessage;

/**
 * Messages thread -> client
 */
export enum WorkerMessageType {
    Init = 0,
    UnchaughtError,
    TaskError,
    TaskResult
}

export interface WorkerInitMessage {
    type: WorkerMessageType.Init;
    methodNames: string[]
}

export interface WorkerUncaughtErrorMessage {
    type: WorkerMessageType.UnchaughtError;
    errorMessage: string
}

export interface WorkerTaskErrorMessage {
    type: WorkerMessageType.TaskError;
    uid: TaskUID;
    errorMessage: string;
}

export interface WorkerTaskResultMessage {
    type: WorkerMessageType.TaskResult;
    uid: TaskUID;
    result: any;
}

export type WorkerMessage = WorkerInitMessage | WorkerUncaughtErrorMessage | WorkerTaskErrorMessage | WorkerTaskResultMessage;

/**
 * Helpers, utils
 */
export function assertMessageEvent(event: Event): asserts event is MessageEvent {
    if(!(event instanceof MessageEvent)) throw new Error("Not MessageEvent");
}