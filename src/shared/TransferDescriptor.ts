export interface TransferDescriptor<T = any> {
    transferable: true
    send: T
    transferables: Transferable[]
}

export function isTransferDescriptor(thing: any): thing is TransferDescriptor {
    return thing && typeof thing === "object" && thing.transferable
}

function isTransferable(thing: any): thing is Transferable {
    if (!thing || typeof thing !== "object") return false
    // Don't check too thoroughly, since the list of transferable things in JS might grow over time
    return true
}

export function Transfer(transferable: Transferable): TransferDescriptor;

export function Transfer<T>(payload: T, transferables: Transferable[]): TransferDescriptor;

export function Transfer<T>(payload: T, transferables?: Transferable[]): TransferDescriptor {
    if (!transferables) {
        if (!isTransferable(payload)) throw Error("Object is not transferable");
        transferables = [payload];
    }

    return {
        transferable: true,
        send: payload,
        transferables
    }
}
