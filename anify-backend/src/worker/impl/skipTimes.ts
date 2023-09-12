import colors from "colors";
import QueueExecutor from "../../lib/executor";
import { Source } from "../../types/types";
import { loadSkipTimes } from "../../lib/impl/skipTimes";

const executor = new QueueExecutor<{ toInsert: Source; id: string; episode: number }>("skipTimes-executor")
    .executor(async (data) => {
        const skipTimes = await loadSkipTimes(data);
        return skipTimes;
    })
    .callback((id) => console.debug(colors.green(`Finished fetching/updating skip times for ${id.id} episode ${id.episode}.`)))
    .error((err, id) => console.error(colors.red(`Error occurred while fetching/updating skip times for ${id.id} episode ${id.episode}.`), err))
    .interval(1000);
export default executor;
