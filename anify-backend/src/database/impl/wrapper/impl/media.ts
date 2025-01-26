import { schemaBuilder } from "../../..";
import { emitter } from "../../../../events";
import { MediaType } from "../../../../types";
import type { IMediaInsertItem } from "../../../../types/impl/database";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import { Events } from "../../../../types/impl/events";
import type { IMedia } from "../../../../types/impl/mappings";
import type DatabaseHandler from "../../handler";
import { AnimeRepository } from "./anime";
import { MangaRepository } from "./manga";
import { SkipTimesRepository } from "./skipTimes";

export class MediaRepository {
    /**
     * @method getStats
     * Returns high-level stats across Anime, Manga, and SkipTimes.
     *
     * @param db The DatabaseHandler instance.
     *
     * @returns An object containing counts of anime, manga, and skipTimes records.
     */
    public static async getStats(db: DatabaseHandler): Promise<{
        animeCount: number;
        mangaCount: number;
        skipTimesCount: number;
    }> {
        // We can reuse the "countAll" methods from each repository (you'll need to ensure they exist on each repo).
        const animeCount = await AnimeRepository.countAll(db);
        const mangaCount = await MangaRepository.countAll(db);
        const skipTimesCount = await SkipTimesRepository.countAll(db);

        return {
            animeCount,
            mangaCount,
            skipTimesCount,
        };
    }

    public static async getByIdAuto(db: DatabaseHandler, id: string): Promise<IMedia | null> {
        // 1) Grab the schemas for anime + manga
        const allSchemas = schemaBuilder.getSchemas();
        const animeSchema = allSchemas[AnimeRepository.tableName];
        const mangaSchema = allSchemas[MangaRepository.tableName];

        if (!animeSchema) {
            throw new Error(`No schema found for table "${AnimeRepository.tableName}". Check your definitions or spelling.`);
        }
        if (!mangaSchema) {
            throw new Error(`No schema found for table "${MangaRepository.tableName}". Check your definitions or spelling.`);
        }

        // 2) Get the list of columns for each table
        const animeCols = animeSchema.columns.map((c: any) => c.name);
        const mangaCols = mangaSchema.columns.map((c: any) => c.name);

        // 3) Combine into one set of all possible columns
        const combinedCols = [...new Set([...animeCols, ...mangaCols])];

        // 4) Build SELECT field lists so both SELECT statements return the same columns in the same order
        //    If a table does not contain a certain column, we select NULL for that column.
        const animeSelectFields = combinedCols
            .map((colName) => {
                return animeCols.includes(colName) ? `"a"."${colName}" AS "${colName}"` : `NULL AS "${colName}"`;
            })
            .join(", ");

        const mangaSelectFields = combinedCols
            .map((colName) => {
                return mangaCols.includes(colName) ? `"m"."${colName}" AS "${colName}"` : `NULL AS "${colName}"`;
            })
            .join(", ");

        // 5) Build a single UNION query. We add a "type" column manually for clarity.
        const sql = `
            SELECT '${MediaType.ANIME}' AS "type",
                   ${animeSelectFields}
              FROM "${animeSchema.name}" AS "a"
             WHERE "a"."id" = $1
    
            UNION ALL
    
            SELECT '${MediaType.MANGA}' AS "type",
                   ${mangaSelectFields}
              FROM "${mangaSchema.name}" AS "m"
             WHERE "m"."id" = $1
    
            LIMIT 1
        `;

        // 6) Execute the query
        const result = await db.query(sql, [id]);

        // 7) If no rows, return null
        if (result.rows.length === 0) {
            return null;
        }

        // 8) Return the first row. The extra columns that do not apply
        //    to the record’s actual type will just be null.
        return result.rows[0] as IMedia;
    }

    /**
     * @method getById
     * Retrieves a record by ID from either the anime or manga table.
     *
     * @param db The DatabaseHandler instance.
     * @param type The MediaType (ANIME or MANGA).
     * @param id The ID of the record.
     *
     * @returns A single record (IAnime | IManga) or null if none found.
     */
    public static async getById(db: DatabaseHandler, type: MediaType, id: string): Promise<IMedia | null> {
        if (type === MediaType.ANIME) {
            return AnimeRepository.getById(db, id);
        } else {
            return MangaRepository.getById(db, id);
        }
    }

    /**
     * @method getBySlug
     * Retrieves a record by its "slug" field from either anime or manga.
     *
     * @param db The DatabaseHandler instance.
     * @param type The MediaType (ANIME or MANGA).
     * @param slug The slug to look up.
     *
     * @returns A single record (IAnime | IManga) or null if none found.
     */
    public static async getBySlug(db: DatabaseHandler, type: MediaType, slug: string): Promise<IMedia | null> {
        if (type === MediaType.ANIME) {
            return AnimeRepository.getBySlug(db, slug);
        } else {
            return MangaRepository.getBySlug(db, slug);
        }
    }

    /**
     * @method fetchAll
     * Retrieves all records from either anime or manga.
     *
     * @param db The DatabaseHandler instance.
     * @param type The MediaType (ANIME or MANGA).
     *
     * @returns An array of media records (IAnime[] or IManga[]).
     */
    public static async fetchAll(db: DatabaseHandler, type: MediaType): Promise<IMedia[]> {
        if (type === MediaType.ANIME) {
            return AnimeRepository.fetchAll(db);
        } else {
            return MangaRepository.fetchAll(db);
        }
    }

    /**
     * @method insert
     * Inserts a new record (Anime or Manga) and returns the inserted object.
     *
     * @param db The DatabaseHandler instance.
     * @param type The MediaType (ANIME or MANGA).
     * @param data The media object to insert.
     *
     * @returns The inserted record (with defaults from the DB).
     */
    public static async insert(db: DatabaseHandler, type: MediaType, data: IMedia): Promise<IMedia> {
        if (type === MediaType.ANIME) {
            return AnimeRepository.insert(db, data as IAnime);
        } else {
            return MangaRepository.insert(db, data as IManga);
        }
    }

    /**
     * @method updatePartially
     * Updates an existing record partially by ID.
     *
     * @param db The DatabaseHandler instance.
     * @param type The MediaType (ANIME or MANGA).
     * @param id The ID of the record to update.
     * @param newData The partial fields to update.
     */
    public static async updatePartially(db: DatabaseHandler, type: MediaType, id: string, newData: Partial<IAnime> | Partial<IManga>): Promise<void> {
        if (type === MediaType.ANIME) {
            await AnimeRepository.updatePartially(db, id, newData as Partial<IAnime>);
        } else {
            await MangaRepository.updatePartially(db, id, newData as Partial<IManga>);
        }
    }

    /**
     * @method deleteById
     * Deletes a record by ID from either Anime or Manga.
     *
     * @param db   The DatabaseHandler instance.
     * @param type The MediaType (ANIME or MANGA).
     * @param id   The ID of the record.
     *
     * @returns    A Promise that resolves once the record is deleted.
     */
    public static async deleteById(db: DatabaseHandler, type: MediaType, id: string): Promise<void> {
        if (type === MediaType.ANIME) {
            await AnimeRepository.deleteById(db, id);
        } else {
            await MangaRepository.deleteById(db, id);
        }
    }

    /**
     * @method batchFetchWithFilter
     * @description
     *  Fetches a list of Anime or Manga records by an array of objects. Each object must at least contain:
     *    - mediaType: The MediaType (ANIME or MANGA)
     *    - id:       The media ID to look up
     *    - [any additional columns to match]
     *
     * Example of an input item:
     *   {
     *     id: "123",
     *     type: MediaType.ANIME,
     *     year: 2020,
     *     format: MediaFormat.TV,
     *     season: "SUMMER"
     *   }
     *
     * The function will look up the anime table schema if type = ANIME (or manga if type = MANGA),
     * then apply the filters as:
     *      WHERE (id = 123 AND year = 2020 AND format = 'TV' AND season = 'SUMMER')
     *   Using a big OR if multiple items were provided.
     */
    public static async batchFetchWithFilter(
        db: DatabaseHandler,
        items: Array<{
            type: MediaType;
            id: string;
            [key: string]: any; // other columns to match
        }>,
    ): Promise<IMedia[]> {
        if (!items.length) {
            return [];
        }

        // 1) Separate into anime vs. manga items
        const animeItems = items.filter((x) => x.type === MediaType.ANIME);
        const mangaItems = items.filter((x) => x.type === MediaType.MANGA);

        // Helper to run a single query for a single type (ANIME or MANGA)
        async function fetchByType(tableName: string, groupItems: Array<{ [key: string]: any }>): Promise<IMedia[]> {
            if (!groupItems.length) {
                return [];
            }

            // Grab the table schema from the schemaBuilder
            const allSchemas = schemaBuilder.getSchemas();
            const tableSchema = allSchemas[tableName];

            if (!tableSchema) {
                throw new Error(`No schema found for table "${tableName}". Check your definitions or spelling.`);
            }

            // We build a giant OR condition: (cond1) OR (cond2) OR ...
            // where condN = (id = X AND col1 = Y AND col2 = Z ...)
            const orClauses: string[] = [];
            const parameters: any[] = [];
            let paramIndex = 1;

            // Figure out the valid column names from the schema
            const validColumns = tableSchema.columns.map((col: any) => col.name);

            for (const row of groupItems) {
                // Build an AND clause for each row
                const andClauses: string[] = [];

                // Always ensure we have "id"
                if (!row.id) {
                    throw new Error(`Missing "id" field in one of the items for table ${tableName}.`);
                }

                // "id" must match
                andClauses.push(`"id" = $${paramIndex++}`);
                parameters.push(row.id);

                // For any other key in the row (besides `type`), check if it’s a valid column
                for (const key of Object.keys(row)) {
                    if (key === "type" || key === "id") continue; // skip these

                    // If it's a valid column in the schema, add an AND condition
                    if (validColumns.includes(key)) {
                        andClauses.push(`"${key}" = $${paramIndex++}`);
                        parameters.push(row[key]);
                    }
                }

                // Combine them into one parenthesized group
                orClauses.push(`(${andClauses.join(" AND ")})`);
            }

            // If no conditions, return early
            if (!orClauses.length) {
                return [];
            }

            // Final query with big OR
            const sql = `
                SELECT * FROM "${tableSchema.name}"
                WHERE
                ${orClauses.join(" OR ")}
            `;

            // Run the query
            const result = await db.query(sql, parameters);
            return result.rows as IMedia[];
        }

        // 2) Run queries for anime and manga items
        const animeResults = await fetchByType(AnimeRepository.tableName, animeItems);
        const mangaResults = await fetchByType(MangaRepository.tableName, mangaItems);

        // 3) Combine and return
        return [...animeResults, ...mangaResults];
    }

    // -------------------------------------------------------------------
    //  DYNAMIC BATCH INSERT
    // -------------------------------------------------------------------
    /**
     * @method batchInsert
     * Inserts multiple Anime/Manga records in as few operations as possible.
     * We dynamically look up columns from the schema instead of hardcoding them.
     *
     * Steps:
     *   1) Separate the items into Anime vs. Manga.
     *   2) Insert all Anime in one multi-row statement (using the schema).
     *   3) Insert all Manga in one multi-row statement (using the schema).
     *   4) Return the newly inserted rows combined into one array.
     *
     * @param db    The DatabaseHandler instance.
     * @param items An array of objects containing type + data to insert.
     * @returns     Array of newly created rows (IAnime[] + IManga[]).
     */
    public static async batchInsert(db: DatabaseHandler, items: IMediaInsertItem[]): Promise<IMedia[]> {
        // 1) Separate the items by type
        const animeItems = items.filter((item) => item.type === MediaType.ANIME).map((x) => x.data as IAnime);

        const mangaItems = items.filter((item) => item.type === MediaType.MANGA).map((x) => x.data as IManga);

        // 2) Insert Anime items (if any)
        let insertedAnime: IAnime[] = [];
        if (animeItems.length > 0) {
            insertedAnime = await MediaRepository.doBatchInsertByTable<IAnime>(db, "anify.anime", animeItems);
        }

        // 3) Insert Manga items (if any)
        let insertedManga: IManga[] = [];
        if (mangaItems.length > 0) {
            insertedManga = await MediaRepository.doBatchInsertByTable<IManga>(db, "anify.manga", mangaItems);
        }

        // 4) Combine results into a single array
        return [...insertedAnime, ...insertedManga];
    }

    /**
     * @method doBatchInsertByTable
     * @description Helper to batch insert records for a specific table
     * using the dynamically fetched columns from the schema. Returns
     * all inserted rows.
     *
     * @param db         The DatabaseHandler instance.
     * @param tableName  The schema name + table, e.g. "anify.anime"
     * @param items      An array of records (object shape) to insert.
     */
    private static async doBatchInsertByTable<T extends object>(db: DatabaseHandler, tableName: string, items: T[]): Promise<T[]> {
        // 1) Grab the table schema
        const allSchemas = schemaBuilder.getSchemas();
        const tableSchema = allSchemas[tableName];
        if (!tableSchema) {
            throw new Error(`No schema found for table "${tableName}". Check your definitions or spelling.`);
        }

        // 2) Dynamically list out columns from the schema
        const columns = tableSchema.columns.map((col) => col.name);

        // 3) Prepare for multi-row insert
        const values: any[] = [];
        let paramIndex = 1; // We'll increment this for each placeholder

        // Build the list of row placeholders:
        // e.g. ["($1, $2::jsonb[], ...)", "(...)", ...]
        const rowPlaceholders = items.map((item) => {
            const colPlaceholders: string[] = [];

            for (const colName of columns) {
                const colDef = tableSchema.columns.find((c) => c.name === colName);
                const rawValue = (item as Record<string, any>)[colName] ?? null;

                if (!colDef) {
                    // If for some reason we can't find the column definition, just skip or push null
                    colPlaceholders.push(`$${paramIndex}`);
                    values.push(rawValue);
                    paramIndex++;
                    continue;
                }

                // Check if the column is JSONB[]
                if (colDef.type.toLowerCase() === "jsonb[]") {
                    // We'll do: $N::jsonb[]
                    colPlaceholders.push(`$${paramIndex}::jsonb[]`);

                    if (Array.isArray(rawValue)) {
                        // Convert each object in the array to a JSON string
                        const stringArray = rawValue.map((obj: any) => JSON.stringify(obj));
                        // Push the entire string array as one parameter (node-postgres will see it as TEXT[])
                        values.push(stringArray);
                    } else {
                        // If it's not an array, fallback to empty
                        values.push([]);
                    }

                    paramIndex++;
                }
                // Check if it's a single JSON / JSONB column
                else if (colDef.type.toLowerCase().includes("json")) {
                    // We'll do: $N::jsonb (or ::json) depending on your schema
                    colPlaceholders.push(`$${paramIndex}::jsonb`);
                    values.push(rawValue ? JSON.stringify(rawValue) : null);
                    paramIndex++;
                }
                // Otherwise it's a normal column
                else {
                    colPlaceholders.push(`$${paramIndex}`);
                    values.push(rawValue);
                    paramIndex++;
                }
            }

            // Return something like: "( $1, $2::jsonb[], $3 )"
            return `(${colPlaceholders.join(", ")})`;
        });

        // If no rows, return early
        if (rowPlaceholders.length === 0) {
            return [];
        }

        // 4) Construct final SQL
        const sql = `
            INSERT INTO "${tableSchema.name}"
            (${columns.map((col) => `"${col}"`).join(", ")})
            VALUES
            ${rowPlaceholders.join(", ")}
            ON CONFLICT ("id") DO NOTHING
            RETURNING *;
        `;

        // 5) Execute the query
        const result = await db.query(sql, values);

        // Optionally emit an event if you want
        await emitter.emitAsync(Events.DATABASE_MAPPINGS_INSERTED, result.rows);

        // 6) Return newly inserted rows
        return result.rows;
    }
}
