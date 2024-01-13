import crypto from "crypto";
const IV_SIZE = 16;
export class AES
{
    static Encrypt(plainText:string, keyString:string)
    {
        const iv = crypto.randomBytes(IV_SIZE);
        const cipher = crypto.createCipheriv("aes-256-cbc", keyString, iv);
        let cipherText = cipher.update(Buffer.from(plainText, "utf8"));
        cipherText = Buffer.concat([cipherText, cipher.final()]);
        const combinedData = Buffer.concat([iv, cipherText]);
        const combinedString = combinedData.toString("base64");
        return encodeURIComponent(combinedString);
    }

    static Decrypt(combinedString:string, keyString:string)
    {
        const combinedData = Buffer.from(decodeURIComponent(combinedString), "base64");
        const iv = Buffer.alloc(IV_SIZE);
        const cipherText = Buffer.alloc(combinedData.length - iv.length);
        combinedData.copy(iv, 0, 0, iv.length);
        combinedData.copy(cipherText, 0, iv.length);
        const decipher = crypto.createDecipheriv("aes-256-cbc", keyString, iv);
        let plainText = decipher.update(cipherText);
        plainText = Buffer.concat([plainText, decipher.final()]);
        return plainText.toString("utf8");
    }
}