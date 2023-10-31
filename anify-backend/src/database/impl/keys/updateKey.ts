import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { Key } from "../../../types/types";

export const updateKey = async (data: Key) => {
    if (dbType === "postgresql") {
        const query: QueryConfig = {
            text: `
                UPDATE "apiKey" SET
                    key = $1,
                    "createdAt" = $2,
                    "updatedAt" = $3,
                    "requestCount" = $4
                WHERE id = $5
            `,
            values: [data.key, data.createdAt, data.updatedAt, data.requestCount, data.id],
        };

        const update = await postgres.query(query);
        return update;
    }
    const query = `
        UPDATE apiKey SET
            key = $key,
            createdAt = $createdAt,
            updatedAt = $updatedAt,
            requestCount = $requestCount
        WHERE id = $id
    `;
    const params = {
        $id: data.id,
        $key: data.key,
        $createdAt: data.createdAt,
        $updatedAt: data.updatedAt,
        $requestCount: data.requestCount,
    };

    const update = sqlite.prepare(query).run(params);
    return update;
};
