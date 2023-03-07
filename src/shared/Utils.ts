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

// Generates a 128 bit random ID, not quite the same as crypto.randomUUID, but close.
export function getRandomUIDLegacy() {
    let uid = "";
    for (let i = 0; i < 16; i++) {
        uid += Math.floor(Math.random() * 255).toString(16).padStart(2, "0");
    }
    return uid;
}

export function getRandomUID() {
    // Difficult to test this branch, so ignore it.
    /* c8 ignore next */
    if(self.crypto && self.crypto.randomUUID) return self.crypto.randomUUID();
    else return getRandomUIDLegacy();
}

export function assert(condition: unknown, message?: string): asserts condition {
    if(!condition) throw new Error(message || "Assertion failed");
}