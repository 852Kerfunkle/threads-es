# CHANGELOG

## 0.3.2
- Add fallback for UID generation if `crypto.randomUUID` is not available (fixes #2).

## 0.3.1
- Worker-side improvements:
  + Improve GC for SharedWorkers (addEventListener prevented GC for abruptly disconnected clients).
  + Improve error handling for SharedWorkers.
- Remove runtime type checks on Transferable objects. Types should be checked at compile time (fixes #1).
- Added testing with playwright in docker container.

## 0.3.0
- Thread and pool are now EventTargets they dispatch unhandled worker errors as events.
- Added thread lifecycle methods to pool (for per thread init and terminate).
- Handle thread spawn failure in pool, if some fail, the entire pool fails.
- Trying to spawn a thread with ServiceWorker now throws an error.
- Simplified and improved types (for example: WorkerModule is now interface).

## 0.2.10
- Documentation.
- Improved internal types.

## 0.2.9
- Change `keepSharedWorkersAlive` shared worker terminate to `forceTerminateShared`.
- Add `EsTheadPool.resolved()` and `EsThread.resolved()`.
- Add optional `threadTerminate` function to `EsThreadPool.terminate()`, to allow for per-thread cleanup.

## 0.2.8
- Add `keepSharedWorkersAlive` option to `EsThreadPool.terminate()`.
- EsThreadPool can use SharedWorker threads, but they have to have unique names (see examples).

## 0.2.7
- Add `keepSharedWorkerAlive` option to `EsThread.terminate()`.
- EsThread: add failiure on timeout.
- Expand stream examples/tests.
- Improve types and internals.