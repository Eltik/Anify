import QueueExecutor from "../helper/queue";
import { Anime, Manga, Type } from "../mapping";
import { createEntry } from "../lib/entry";
import colors from "colors";

const executor = new QueueExecutor<{ toInsert: Anime | Manga; type: Type }>("entry-executor")
    .executor(async (data) => {
        const media = await createEntry(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished creating entry for media ${id.toInsert.title.english ?? id.toInsert.title.romaji ?? id.toInsert.title.native}`)))
    .error((err, id) => console.error(colors.red(`Error occurred while creating entry for media ${id.toInsert.title.english ?? id.toInsert.title.romaji ?? id.toInsert.title.native}`), err))
    .interval(500);
export default executor;
