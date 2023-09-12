import EventEmitter2 from "eventemitter2";

export enum Events {
    COMPLETED_MAPPING_LOAD = "mapping.load.completed",
    COMPLETED_SKIPTIMES_LOAD = "skiptimes.load.completed",
    COMPLETED_SEARCH_LOAD = "search.load.completed",
    COMPLETED_SEASONAL_LOAD = "seasonal.load.completed",
    COMPLETED_ENTRY_CREATION = "entry.creation.completed",
    COMPLETED_PAGES_UPLOAD = "page.upload.completed",
}

const emitter = new EventEmitter2({});

export default emitter;
