export interface TransferDescriptor<T = any> {
    transferable: boolean;
    send: T;
    transferables: Transferable[];
}

export function isTransferDescriptor(thing: any): thing is TransferDescriptor {
    return thing && typeof thing === "object" && thing.transferable
}

const TransferableTypes = [
    OffscreenCanvas,
    ImageBitmap,
    MessagePort,
    ReadableStream,
    WritableStream,
    TransformStream,
    ArrayBuffer] as const;

function assertTransferable(thing: any): asserts thing is Transferable {
    let isTransferable = false
    for(const type of TransferableTypes) {
        if(thing instanceof type) {
            isTransferable = true;
            break;
        }
    }
    if(!isTransferable) throw new Error("Object is not transferable");
}

export function Transfer(transferable: Transferable): TransferDescriptor;

export function Transfer<T extends Transferable>(payload: T, transferables: Transferable[]): TransferDescriptor;

export function Transfer<T extends Transferable>(payload: T, transferables?: Transferable[]): TransferDescriptor {
    if(!transferables) {
        transferables = [payload];
    }

    for (const transfer of transferables) {
        assertTransferable(transfer);
    }

    return {
        transferable: true,
        send: payload,
        transferables
    }
}
