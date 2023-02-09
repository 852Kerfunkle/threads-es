import { expect } from "@esm-bundle/chai";
import { TransferDescriptor } from "../../../src/shared/TransferDescriptor";
import { exposeApi } from "../../../src/worker/Worker"

const transferReadableStreamApi = {
    transferReadableStream: async (stream: TransferDescriptor<ReadableStream<string>>) => {
        const reader = stream.send.getReader();

        const messages: string[] = [];

        while(true) {
            const {value, done} = await reader.read();
            if(done) break;
            messages.push(value);
        }

        expect(messages).to.be.eql(["Hello", "World!"]);
    }
}

export type TransferReadableStreamApiType = typeof transferReadableStreamApi;

exposeApi(transferReadableStreamApi);