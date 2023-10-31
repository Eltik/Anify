import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { Key } from "../../../types/types";

export const createKey = async (data: Key) => {
    if (dbType === "postgresql") {
        const query: QueryConfig = {
            text: `
                INSERT INTO "apiKey" (
                    id,
                    key,
                    "createdAt",
                    "updatedAt",
                    "requestCount"
                ) VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )
            `,
            values: [data.id, data.key, new Date(data.createdAt), new Date(data.updatedAt), data.requestCount],
        };

        const insert = await postgres.query(query);
        return insert;
    }

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

    const insert = sqlite.prepare(query).run(params);
    return insert;
};
