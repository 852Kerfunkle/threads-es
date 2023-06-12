import { TaskUID } from "../../shared/Messages.js";
import { assert, getRandomUID } from "../../shared/Utils.js";

type ResolveFn<T> = (value: T | PromiseLike<T>) => void;
type RejectFn = (reason?: Error) => void;
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopExecutor = () => {};

export class EsTaskPromise<T> extends Promise<T> {
    public readonly taskUID: TaskUID = getRandomUID();
    public readonly resolve: ResolveFn<T>;
    public readonly reject: RejectFn;

    constructor(executor: (resolve: ResolveFn<T>, reject: RejectFn) => void = noopExecutor) {
        let localResolve: ResolveFn<T> | undefined;
        let localReject: RejectFn | undefined;
        super((resolve, reject) => {
            localResolve = resolve;
            localReject = reject;
            executor(resolve, reject);
        });
        assert(localResolve && localReject);
        this.resolve = localResolve;
        this.reject = localReject;
    }
}