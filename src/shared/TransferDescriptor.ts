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

// NOTE: causes issues on browsers where not all transferable types are defined.
/*const TransferableTypes = [
    OffscreenCanvas,
    ImageBitmap,
    MessagePort,
    ReadableStream,
    WritableStream,
    TransformStream,
    ArrayBuffer] as const;

function isTransferable(thing: object): thing is Transferable {
    let isTransferable = false;
    for(const type of TransferableTypes) {
        if(thing instanceof type) {
            isTransferable = true;
            break;
        }
    }
    return isTransferable;
}

function assertTransferable(thing: object): asserts thing is Transferable {
    if(!isTransferable(thing)) throw new Error("Object is not transferable");
}*/

export function Transfer<T extends Transferable>(transferable: T): TransferDescriptor<T>;

export function Transfer<T extends object>(payload: T, transferables: Transferable[]): TransferDescriptor<T>;

export function Transfer<T extends object>(payload: T, transferables?: Transferable[]): TransferDescriptor<T> {
    // If no transferables are specified (first variant),
    // payload must be a Transferable.
    if(!transferables) {
        //assertTransferable(payload);
        transferables = [payload as Transferable];
    }
    // Else transferables are specified (second variant),
    // each transferable must be a Transferable.
    /*else {
        for (const transfer of transferables) {
            assertTransferable(transfer);
        }
    }*/

    return {
        [$transferable]: true,
        send: payload,
        transferables
    }
}
