import colors from "colors";
import QueueExecutor from "./helper/impl/executor";
import type { MediaFormat, MediaType } from "../../types";
import loadMapping from "../../lib/impl/mappings";

const executor = new QueueExecutor<{ id: string; type: MediaType; formats: MediaFormat[] }>("mapping-executor")
    .executor(async (data) => {
        const media = await loadMapping(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished mapping for media ${id.id}`)))
    .error((err, id) => console.error(colors.red(`Error occurred while mapping for media ${id.id}`), err))
    .interval(1000);
export default executor;
