export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function withTimeout<T>(
    promise: Promise<T>,
    timout: number,
    errorMessage = "Promise timed out"
): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(errorMessage));
        }, timout);
    });

    return Promise.race<T>([promise, timeout]);
}

export function getRandomUID() {
    assert(self.crypto && self.crypto.randomUUID, "crypto.getRandomUID() is undefined");
    return self.crypto.randomUUID();
}

export function assert(condition: unknown, message?: string): asserts condition {
    if(!condition) throw new Error(message || "Assertion failed");
}