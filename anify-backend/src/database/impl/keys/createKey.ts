import { db } from "../..";
import { Key } from "../../../types/types";

export const createKey = async (data: Key) => {
    const query = `INSERT INTO apiKey (
        id,
        key,
        createdAt,
        updatedAt,
        requestCount
    ) VALUES (
        $id,
        $key,
        $createdAt,
        $updatedAt,
        $requestCount
    )`;
    const params = {
        $id: data.id,
        $key: data.key,
        $createdAt: data.createdAt,
        $updatedAt: data.updatedAt,
        $requestCount: data.requestCount,
    };

    const insert = db.prepare(query).run(params);
    return insert;
};
