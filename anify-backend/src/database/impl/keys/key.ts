import { db } from "../..";
import { Db, Key } from "../../../types/types";

export const getKey = async (id: string): Promise<Key | undefined> => {
    const key = db.query<Db<Key>, { $id: string }>(`SELECT * FROM apiKey WHERE id = $id`).get({ $id: id });
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
    const keys = db.query(`SELECT * FROM apiKey`).all() as Db<Key>[];
    return keys;
};
