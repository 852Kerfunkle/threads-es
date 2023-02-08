import { TransferDescriptor } from "../../src/shared/TransferDescriptor";
import { exposeApi } from "../../src/worker/Worker"

const transferReadableStreamApi = {
    transferReadableStream: async (stream: TransferDescriptor<ReadableStream<string>>) => {
        const reader = stream.send.getReader();

        while(true) {
            const {value, done} = await reader.read();
            if(done) break;
            console.log(value); // logs 'hello'.
        }
    }
}

export type TransferReadableStreamApiType = typeof transferReadableStreamApi;

exposeApi(transferReadableStreamApi);