export interface TransferDescriptor<T = any> {
    transferable: boolean;
    send: T;
    transferables: Transferable[];
}

export function isTransferDescriptor(thing: any): thing is TransferDescriptor {
    return thing && typeof thing === "object" && thing.transferable
        && typeof thing.send === "object" && Array.isArray(thing.transferables);
}

const TransferableTypes = [
    OffscreenCanvas,
    ImageBitmap,
    MessagePort,
    ReadableStream,
    WritableStream,
    TransformStream,
    ArrayBuffer] as const;

function isTransferable(thing: any): thing is Transferable {
    let isTransferable = false
    for(const type of TransferableTypes) {
        if(thing instanceof type) {
            isTransferable = true;
            break;
        }
    }
    return isTransferable;
}

function assertTransferable(thing: any): asserts thing is Transferable {
    if(!isTransferable(thing)) throw new Error("Object is not transferable");
}

export function Transfer(transferable: Transferable): TransferDescriptor;

export function Transfer<T>(payload: T, transferables: Transferable[]): TransferDescriptor;

export function Transfer<T>(payload: T, transferables?: Transferable[]): TransferDescriptor {
    // If no transferables are specified, payload must be a Transferable.
    if(!transferables) {
        assertTransferable(payload);
        transferables = [payload];
    }
    // If transferables are specified, each transferable must be a Transferable.
    else {
        for (const transfer of transferables) {
            assertTransferable(transfer);
        }
    }

    return {
        transferable: true,
        send: payload,
        transferables
    }
}
