import EventEmitter2 from "eventemitter2";

export enum Events {
    COMPLETED_MAPPING_LOAD = "mapping.load.completed",
    COMPLETED_SKIPTIMES_LOAD = "skiptimes.load.completed",
    COMPLETED_SEARCH_LOAD = "search.load.completed",
    COMPLETED_SEASONAL_LOAD = "seasonal.load.completed",
    COMPLETED_ENTRY_CREATION = "entry.creation.completed",
    COMPLETED_MANGA_UPLOAD = "manga.upload.completed",
    COMPLETED_NOVEL_UPLOAD = "novel.upload.completed",

    KEY_LIMIT_REACHED = "key.limit.reached",
    KEY_UPDATE = "key.update",
}

const emitter = new EventEmitter2({});

export default emitter;
