export function isString(object: unknown): object is string {
    return typeof object === "string";
}

export function setIntervalImmediately(func: () => Promise<void>, interval: number) {
    func();
    return setInterval(async () => {
        try {
            await func();
        } catch (e) {
            console.error("Error occurred while trying to execute the interval function: ", e);
        }
    }, interval);
}

export const averageMetric = (object: any) => {
    let average = 0,
        validCount = 0;
    for (const [_, v] of Object.entries(object)) {
        if (v && typeof v === "number") {
            average += v;
            validCount++;
        }
    }

    return validCount === 0 ? 0 : Number.parseFloat((average / validCount).toFixed(2));
};
