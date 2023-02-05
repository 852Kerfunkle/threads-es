
/**
 * Messages client -> thread
 */
export enum ClientMessageType {
    Run = 0,
    Cancel = 1,
}

export interface ClientMessage {
    type: ClientMessageType;
    uid: number;
}

export interface ClientJobRunMessage extends ClientMessage {
    type: ClientMessageType.Run;
    method: string;
    args: any[];
}

/*export interface ClientJobCancelMessage extends ClientMessage {
    type: ClientMessageType.Cancel;
}*/

//export const isClientJobCancelMessage = (thing: ClientMessage): thing is ClientJobCancelMessage => thing && thing.type === ClientMessageType.Cancel
export const isClientJobRunMessage = (thing: ClientMessage): thing is ClientJobRunMessage => thing && thing.type === ClientMessageType.Run

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