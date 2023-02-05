import { Transfer, TransferDescriptor } from "../../shared/TransferDescriptor";
import { exposeApi } from "../../worker"

const transferArrayApi = {
    transferArray: (array: TransferDescriptor<ArrayBuffer>): TransferDescriptor<ArrayBuffer> => {
        const uint8 = new Uint8Array(array.send);
        uint8.forEach((value, index) => {
            uint8[index] = 0;
        });
        return Transfer(uint8.buffer);
    }
}

export type TransferArrayApiType = typeof transferArrayApi;

exposeApi(transferArrayApi);