import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { Db, Key } from "../../../types/types";

export const getKey = async (id: string): Promise<Key | undefined> => {
    if (dbType === "postgresql") {
        const query: QueryConfig = {
            text: `
                SELECT * FROM "apiKey"
                WHERE id = $1
            `,
            values: [id],
        };

        const key = await postgres.query<Db<Key>>(query).then((res) => res.rows[0]);
        return key;
    }
    const key = sqlite.query<Db<Key>, { $id: string }>(`SELECT * FROM apiKey WHERE id = $id`).get({ $id: id });
    return key
        ? {
              id: key.id,
              key: key.key,
              createdAt: key.createdAt,
              requestCount: key.requestCount,
              updatedAt: key.updatedAt,
          }
        : undefined;
};

export const getKeys = async (): Promise<Key[] | undefined> => {
    if (dbType === "postgresql") {
        const query: QueryConfig = {
            text: `
                SELECT * FROM "apiKey"
            `,
        };
        const keys = await postgres.query<Db<Key>>(query).then((res) => res.rows);
        return keys;
    } else {
        const keys = sqlite.query(`SELECT * FROM apiKey`).all() as Db<Key>[];
        return keys;
    }
};
