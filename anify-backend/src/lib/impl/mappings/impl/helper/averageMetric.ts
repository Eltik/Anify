export const averageMetric = (object: Record<string, unknown>) => {
    if (!object) return 0;

    // Filter valid numeric values and convert to array
    const validValues = Object.values(object).filter((v): v is number => 
        v !== null && typeof v === "number" && !Number.isNaN(v)
    );

    if (validValues.length === 0) return 0;

    // Calculate sum using reduce for better performance
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    
    // Calculate average and round to 2 decimal places using math operations
    // This is more precise than string operations with toFixed()
    return Math.round((sum / validValues.length) * 100) / 100;
};
