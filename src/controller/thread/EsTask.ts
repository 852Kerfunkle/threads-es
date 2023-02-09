import { TaskUID } from "../../shared/Messages";
import { getRandomUID } from "../../shared/Utils";

type ResolveFn<T> = (value: T | PromiseLike<T>) => void;
type RejectFn = (reason?: Error) => void;
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopExecutor = () => {};

export class EsTaskPromise<T> extends Promise<T> {
    public readonly taskUID: TaskUID = getRandomUID();
    private readonly resolveFn: ResolveFn<T>;
    private readonly rejectFn: RejectFn;
    private settled = false;

    constructor(executor: (resolve: ResolveFn<T>, reject: RejectFn) => void = noopExecutor) {
        let localResolve: ResolveFn<T> | undefined;
        let localReject: RejectFn | undefined;
        super((resolve, reject) => {
            localResolve = resolve;
            localReject = reject;
            executor(resolve, reject);
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.resolveFn = localResolve!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.rejectFn = localReject!;
    }

    public resolve(value: T): void {
        if (!this.settled) {
            this.settled = true;
            this.resolveFn(value);
        }
    }

    public reject(error: Error): void {
        if (!this.settled) {
            this.settled = true;
            this.rejectFn(error);
        }
    }
}