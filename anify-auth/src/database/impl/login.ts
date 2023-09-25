import { db } from "..";
import { dehashPassword } from "../../helper";

export const login = async (username: string, password: string) => {
    const query = `
        SELECT * FROM User WHERE username = $username;
    `;

    const user = await db.query(query).get({ $username: username });
    if (!user) return null;

    const valid = await dehashPassword(password, (user as any).password);
    if (!valid) return null;

    return user;
};
