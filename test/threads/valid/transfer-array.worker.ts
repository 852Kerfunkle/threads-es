import { Transfer, TransferDescriptor } from "../../../src/shared/TransferDescriptor";
import { exposeApi } from "../../../src/worker/Worker"

const transferArrayApi = {
    transferArray: (mul: number, array: TransferDescriptor<ArrayBuffer>): TransferDescriptor<ArrayBuffer> => {
        const uint8 = new Uint8Array(array.send);
        uint8.forEach((value, index) => {
            uint8[index] = value * mul;
        });
        return Transfer(uint8.buffer);
    }
}

export type TransferArrayApiType = typeof transferArrayApi;

exposeApi(transferArrayApi);