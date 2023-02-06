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

export interface ControllerJobRunMessage extends ControllerMessage {
    uid: TaskUID;
    method: string;
    args: any[];
}

/*export interface ControllerJobCancelMessage extends ControllerMessage {
    uid: TaskUID;
}*/

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ControllerTerminateMessage extends ControllerMessage { }

//export const isControllerJobCancelMessage = (thing: ControllerMessage): thing is ControllerJobCancelMessage => thing && thing.type === ControllerMessageType.Cancel
export const isControllerJobRunMessage = (thing: ControllerMessage): thing is ControllerJobRunMessage => thing && thing.type === ControllerMessageType.Run
export const isControllerTerminateMessage = (thing: ControllerMessage): thing is ControllerTerminateMessage => thing && thing.type === ControllerMessageType.Terminate

/**
 * Messages thread -> client
 */
export enum WorkerMessageType {
    Init = 0,
    UnchaughtError,
    JobError,
    JobResult
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

export interface WorkerJobErrorMessage extends WorkerMessage {
    uid: TaskUID;
    errorMessage: string;
}

export interface WorkerJobResultMessage extends WorkerMessage {
    uid: TaskUID;
    result: any;
}

export const isWorkerInitMessage = (thing: WorkerMessage): thing is WorkerInitMessage => thing && thing.type === WorkerMessageType.Init;
export const isWorkerUncaughtErrorMessage = (thing: WorkerMessage): thing is WorkerUncaughtErrorMessage => thing && thing.type === WorkerMessageType.UnchaughtError;
export const isWorkerJobErrorMessage = (thing: WorkerMessage): thing is WorkerJobErrorMessage => thing && thing.type === WorkerMessageType.JobError;
export const isWorkerJobResultMessage = (thing: WorkerMessage): thing is WorkerJobResultMessage => thing && thing.type === WorkerMessageType.JobResult;

/**
 * Helpers, utils
 */
export function assertMessageEvent(event: Event): asserts event is MessageEvent {
    if(!(event instanceof MessageEvent)) throw new Error("Not MessageEvent");
}