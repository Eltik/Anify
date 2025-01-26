export const averageMetric = (object: Record<string, unknown>) => {
    let average = 0;
    let validCount = 0;
    if (!object) return 0;

    for (const [, v] of Object.entries(object)) {
        if (v && typeof v === "number") {
            average += v;
            validCount++;
        }
    }

    return validCount === 0 ? 0 : Number.parseFloat((average / validCount).toFixed(2));
};
