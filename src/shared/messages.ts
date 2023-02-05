
/**
 * Messages client -> thread
 */
export enum ControllerMessageType {
    Run = 0,
    Cancel = 1,
}

export interface ControllerMessage {
    type: ControllerMessageType;
    uid: string;
}

export interface ControllerJobRunMessage extends ControllerMessage {
    type: ControllerMessageType.Run;
    method: string;
    args: any[];
}

/*export interface ControllerJobCancelMessage extends ControllerMessage {
    type: ControllerMessageType.Cancel;
}*/

//export const isControllerJobCancelMessage = (thing: ControllerMessage): thing is ControllerJobCancelMessage => thing && thing.type === ControllerMessageType.Cancel
export const isControllerJobRunMessage = (thing: ControllerMessage): thing is ControllerJobRunMessage => thing && thing.type === ControllerMessageType.Run

/**
 * Messages thread -> client
 */
export enum WorkerMessageType {
    Init = 0,
    UnchaughtError = 1,
    JobError = 2,
    JobResult = 3
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
    uid: string;
    errorMessage: string;
}

export interface WorkerJobResultMessage extends WorkerMessage {
    type: WorkerMessageType.JobResult;
    uid: string;
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