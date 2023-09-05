import QueueExecutor from "../helper/queue";
import { Format, Type } from "../mapping";
import { loadSearch } from "../lib/search";
import colors from "colors";

const executor = new QueueExecutor<{ query: string; type: Type; formats: Format[] }>("search-executor")
    .executor(async (data) => {
        const media = await loadSearch(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished searching for media ${id.query} via the database/AniList.`)))
    .error((err, id) => console.error(colors.red(`Error occurred while searching for media via the database/AniList ${id.query}`), err))
    .interval(1000);
export default executor;
