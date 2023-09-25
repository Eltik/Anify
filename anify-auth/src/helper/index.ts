import * as bcrypt from "bcryptjs";

export function generateUUID(): string {
    const pattern = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return pattern.replace(/[xy]/g, (char) => {
        const random = (Math.random() * 16) | 0;
        const value = char === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

export function isValidDate(d: any) {
    return d instanceof Date && !isNaN(Number(d));
}

export async function hashPassword(password: string): Promise<{ password: string; salt: string }> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    return { password: hash, salt: salt };
}

export async function dehashPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}
