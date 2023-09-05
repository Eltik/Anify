import QueueExecutor from "../helper/queue";
import { loadMapping } from "../lib/mappings";
import { Type } from "../mapping";
import colors from "colors";

const executor = new QueueExecutor<{ id: string; type: Type }>("mapping-executor")
    .executor(async (data) => {
        const media = await loadMapping(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished mapping for media ${id.id}`)))
    .error((err, id) => console.error(colors.red(`Error occurred while mapping for media ${id.id}`), err))
    .interval(1000);
export default executor;
