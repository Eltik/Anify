import { db } from "..";

export const get = async (id: string) => {
    const query = `
        SELECT * FROM User WHERE id = $id;
    `;
    return await db.query(query).get({ $id: id });
};
