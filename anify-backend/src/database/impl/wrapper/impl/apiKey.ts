import type { IApiKey } from "../../../../types/impl/database/impl/schema/apiKey";
import DatabaseHandler from "../../handler";

export class ApiKeyRepository {
    /**
     * @description The table name for API keys.
     */
    public static readonly tableName = "anify.api_key";

    /**
     * @method getById Retrieves a single API key record by ID.
     * @param db The DatabaseHandler instance.
     * @param id The ID of the API key to retrieve.
     * @returns IApiKey or null if not found.
     */
    public static async getById(db: DatabaseHandler, id: string): Promise<IApiKey | null> {
        const rows = await db.select<IApiKey>(ApiKeyRepository.tableName, { id });
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * @method getByKey Retrieves a single API key record by key.
     * @param db The DatabaseHandler instance.
     * @param key The key of the API key to retrieve.
     * @returns IApiKey or null if not found.
     */
    public static async getByKey(db: DatabaseHandler, key: string): Promise<IApiKey | null> {
        const rows = await db.select<IApiKey>(ApiKeyRepository.tableName, { key });
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * @method insert Inserts a new API key record and returns the newly created row.
     * @param db The DatabaseHandler instance.
     * @param apiKey The API key object to insert.
     * @returns The inserted API key row (with defaults applied).
     */
    public static async insert(db: DatabaseHandler, apiKey: IApiKey): Promise<IApiKey> {
        const inserted = await db.insert<IApiKey>(ApiKeyRepository.tableName, apiKey);
        return inserted;
    }

    /**
     * @method updatePartially Updates a subset of fields in the API key record.
     * @param db The DatabaseHandler instance.
     * @param id The API key ID to update.
     * @param newData The fields to update.
     */
    public static async updatePartially(db: DatabaseHandler, id: string, newData: Partial<IApiKey>): Promise<void> {
        await db.update<IApiKey>(ApiKeyRepository.tableName, newData, { id });
    }

    /**
     * @method deleteById
     * Deletes an API key record by its ID.
     *
     * @param db  The DatabaseHandler instance.
     * @param id  The ID of the record to delete.
     */
    public static async deleteById(db: DatabaseHandler, id: string): Promise<void> {
        const sql = `
            DELETE FROM "${ApiKeyRepository.tableName}"
            WHERE "id" = $1
        `;
        await db.query(sql, [id]);
    }

    /**
     * @method countAll
     * Returns the total number of API keys in the API key table.
     *
     * @param db The DatabaseHandler instance.
     */
    public static async countAll(db: DatabaseHandler): Promise<number> {
        const sql = `
            SELECT COUNT(*) AS "total"
            FROM "${ApiKeyRepository.tableName}"
        `;
        const result = await db.query(sql);
        // Convert the result's string to a number
        return parseInt(result.rows[0].total, 10);
    }

    /**
     * @method fetchAll Retrieves all API key records.
     * @param db The DatabaseHandler instance.
     * @returns Array of IApiKey objects.
     */
    public static async fetchAll(db: DatabaseHandler): Promise<IApiKey[]> {
        return db.select<IApiKey>(ApiKeyRepository.tableName);
    }
}
