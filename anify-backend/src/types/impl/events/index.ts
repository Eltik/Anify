/**
 * @fileoverview Main entry point for the database types.
 */

/**
 * @description Events that can be emitted by the event emitter.
 */
export enum Events {
    /**
     * @description Proxies events
     */
    PROXIES_LOADED = "proxies.loaded",
    PROXIES_SAVED = "proxies.saved",

    /**
     * @description Database events
     */
    DATABASE_CONNECTED = "database.connected",
    DATABASE_DISCONNECTED = "database.disconnected",
    DATABASE_SCHEMA_SYNCED = "database.schema.synced",
    DATABASE_TABLE_CREATED = "database.table.created",
    DATABASE_TABLE_ALTERED = "database.table.altered",

    /**
     * @description Mapping events
     */
    DATABASE_MAPPINGS_INSERTED = "database.mappings.inserted",
    COMPLETED_MAPPING_LOAD = "mapping.load.completed",

    /**
     * @description Content events
     */
    COMPLETED_EPISODES_LOAD = "episodes.load.completed",

    COMPLETED_SKIPTIMES_LOAD = "skiptimes.load.completed",
    COMPLETED_SEARCH_LOAD = "search.load.completed",
    COMPLETED_SEASONAL_LOAD = "seasonal.load.completed",
    COMPLETED_ENTRY_CREATION = "entry.creation.completed",
    COMPLETED_MANGA_UPLOAD = "manga.upload.completed",
    COMPLETED_NOVEL_UPLOAD = "novel.upload.completed",
}
