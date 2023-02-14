const $transferable = Symbol("threads-es.transferable");

export interface TransferDescriptor<T extends object> {
    [$transferable]: true;
    send: T;
    transferables: Transferable[];
}

export function isTransferDescriptor(thing: any): thing is TransferDescriptor<any> {
    // Since $transferable is a symbol, this check should be enough.
    return thing && typeof thing === "object" && thing[$transferable];
}

export function Transfer<T extends Transferable>(transferable: T): TransferDescriptor<T>;

export function Transfer<T extends object>(payload: T, transferables: Transferable[]): TransferDescriptor<T>;

export function Transfer<T extends object>(payload: T, transferables?: Transferable[]): TransferDescriptor<T> {
    // If no transferables are specified (first variant),
    // payload must be a Transferable.
    if(!transferables) {
        transferables = [payload as Transferable];
    }
    // Else transferables are specified (second variant),
    // each transferable must be a Transferable.

    return {
        [$transferable]: true,
        send: payload,
        transferables
    }
}
