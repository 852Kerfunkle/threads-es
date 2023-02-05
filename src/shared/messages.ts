
/**
 * Messages client -> thread
 */
export enum ControllerMessageType {
    Run = 0,
    Cancel = 1,
}

export interface ControllerMessage {
    type: ControllerMessageType;
    uid: number;
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
export enum ThreadMessageType {
    Init = 0,
    UnchaughtError = 1,
    JobError = 2,
    JobResult = 3
}

export interface ThreadMessage {
    type: ThreadMessageType;
}

export interface ThreadInitMessage extends ThreadMessage {
    type: ThreadMessageType.Init;
    methodNames: string[]
}

export interface ThreadUncaughtErrorMessage extends ThreadMessage {
    type: ThreadMessageType.UnchaughtError;
    errorMessage: string
}

export interface ThreadJobErrorMessage extends ThreadMessage {
    type: ThreadMessageType.JobError;
    uid: number;
    errorMessage: string;
}

export interface ThreadJobResultMessage extends ThreadMessage {
    type: ThreadMessageType.JobResult;
    uid: number;
    result: any;
}

export const isThreadInitMessage = (thing: ThreadMessage): thing is ThreadInitMessage => thing && thing.type === ThreadMessageType.Init;
export const isThreadUncaughtErrorMessage = (thing: ThreadMessage): thing is ThreadUncaughtErrorMessage => thing && thing.type === ThreadMessageType.UnchaughtError;
export const isThreadJobErrorMessage = (thing: ThreadMessage): thing is ThreadJobErrorMessage => thing && thing.type === ThreadMessageType.JobError;
export const isThreadJobResultMessage = (thing: ThreadMessage): thing is ThreadJobResultMessage => thing && thing.type === ThreadMessageType.JobResult;

/**
 * Helpers, utils
 */
export function assertMessageEvent(event: Event): asserts event is MessageEvent {
    if(!(event instanceof MessageEvent)) throw new Error("Not MessageEvent");
}