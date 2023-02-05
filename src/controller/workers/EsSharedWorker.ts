import { EsWorkerInterface } from "./EsWorkerInterface";

/*export class EsSharedWorker extends SharedWorker implements EsWorkerInterface {
    constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.port.start();
    }

    postMessage(message: any, transfer: Transferable[]): void {
        this.port.postMessage(message, transfer);
    }

    terminate(): void {
        // TODO: post client disconnect message first
        this.port.close();
    }
}*/