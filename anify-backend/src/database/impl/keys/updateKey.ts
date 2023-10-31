import { db, dbType } from "../..";
import { Key } from "../../../types/types";

export const updateKey = async (data: Key) => {
    if (dbType === "postgresql") {
        const query = `
            UPDATE "apiKey" SET
                key = $key,
                "createdAt" = $createdAt,
                "updatedAt" = $updatedAt,
                "requestCount" = $requestCount
            WHERE id = $id
        `;
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

    const update = db.prepare(query).run(params);
    return update;
};
