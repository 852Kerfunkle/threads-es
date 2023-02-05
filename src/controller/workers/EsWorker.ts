import { EsWorkerInterface } from "./EsWorkerInterface";

export class EsWorker extends Worker implements EsWorkerInterface {
    constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
    }
}