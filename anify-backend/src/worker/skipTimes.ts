import QueueExecutor from "@/src/helper/queue";
import colors from "colors";
import { Source } from "../mapping/impl/anime";
import { loadSkipTimes } from "../lib/skipTimes";

const executor = new QueueExecutor<{ toInsert: Source; id: string; episode: number }>("skipTimes-executor")
    .executor(async (data) => {
        const skipTimes = await loadSkipTimes(data);
        return skipTimes;
    })
    .callback((id) => console.debug(colors.green(`Finished fetching skip times for ${id.id} episode ${id.episode}.`)))
    .error((err, id) => console.error(colors.red(`Error occurred while fetching skip times for ${id.id} episode ${id.episode}.`), err))
    .interval(1000);
export default executor;
