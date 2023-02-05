
export enum WorkerMessageType {
    Run = 0
}

export interface WorkerMessage {
    type: WorkerMessageType;
    uid: number;
}

export interface WorkerJobRunMessage extends WorkerMessage {
    method: string;
    args: any[];
}