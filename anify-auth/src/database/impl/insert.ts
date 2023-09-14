import { db } from "..";
import { generateUUID } from "../../helper";
import { IDs } from "../../types";

export const insertUser = async (ids: IDs, username: string, password: string, salt: string) => {
    // Check if user already exists
    const user = await db
        .query(
            `
        SELECT * FROM User WHERE username = $username;
    `,
        )
        .get({ $username: username });
    if (user) return null;

    const query = `
        INSERT INTO User (id, username, password, salt, anilistId, malId, simklId) VALUES ($id, $username, $password, $salt, $anilistId, $malId, $simklId);
    `;

    await db.query(query).run({
        $id: generateUUID(),
        $username: username,
        $password: password,
        $salt: salt,
        $anilistId: ids.anilistId ?? "",
        $malId: ids.malId ?? "",
        $simklId: ids.simklId ?? "",
    });
};
