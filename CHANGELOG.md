# CHANGELOG

## 0.2.8
- Add `keepSharedWorkersAlive` option to `EsThreadPool.terminate()`.
- EsThreadPool can use SharedWorker threads, but they have to have unique names (see examples).

## 0.2.7
- Add `keepSharedWorkerAlive` option to `EsThread.terminate()`.
- EsThread: add failiure on timeout.
- Expand stream examples/tests.
- Improve types and internals.