export type JobUID = string;

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
    type: ControllerMessageType.Run;
    uid: JobUID;
    method: string;
    args: any[];
}

/*export interface ControllerJobCancelMessage extends ControllerMessage {
    type: ControllerMessageType.Cancel;
    uid: JobUID;
}*/

export interface ControllerTerminateMessage extends ControllerMessage {
    type: ControllerMessageType.Terminate;
}

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
    type: WorkerMessageType.Init;
    methodNames: string[]
}

export interface WorkerUncaughtErrorMessage extends WorkerMessage {
    type: WorkerMessageType.UnchaughtError;
    errorMessage: string
}

export interface WorkerJobErrorMessage extends WorkerMessage {
    type: WorkerMessageType.JobError;
    uid: JobUID;
    errorMessage: string;
}

export interface WorkerJobResultMessage extends WorkerMessage {
    type: WorkerMessageType.JobResult;
    uid: JobUID;
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