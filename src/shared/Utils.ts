export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function getRandomUID() {
    return self.crypto.randomUUID();
}