import bcrypt from "bcrypt";

export function generateUUID(): string {
    const pattern = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return pattern.replace(/[xy]/g, (char) => {
        const random = (Math.random() * 16) | 0;
        const value = char === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

export function isValidDate(d) {
    return d instanceof Date && !isNaN(Number(d));
}

export async function hashPassword(password: string): Promise<{ password: string, salt: string }> {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return { password: hash, salt };
}

export async function dehashPassword(password: string, hash: string): Promise<string> {
    return await bcrypt.compare(password, hash);
}