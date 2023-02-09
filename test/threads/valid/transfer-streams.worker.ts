import { expect } from "@esm-bundle/chai";
import { TransferDescriptor } from "../../../src/shared/TransferDescriptor";
import { exposeApi } from "../../../src/worker/Worker"

const transferStreamsApi = {
    transferStreams: async (read: TransferDescriptor<ReadableStream<string>>, write: TransferDescriptor<WritableStream<string>>) => {
        const reader = read.send.getReader();

        const messages: string[] = [];

        while(true) {
            const {value, done} = await reader.read();
            if(done) break;
            messages.push(value);
        }

        expect(messages).to.be.eql(["Hello", "World!"]);

        const writer = write.send.getWriter();
        await writer.write("World");
        await writer.write("Hello!");
        await writer.close();
    }
}

export type TransferStreamsApiType = typeof transferStreamsApi;

exposeApi(transferStreamsApi);