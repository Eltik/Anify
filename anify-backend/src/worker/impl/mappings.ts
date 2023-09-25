import QueueExecutor from "../../lib/executor";
import { loadMapping } from "../../lib/impl/mappings";
import colors from "colors";
import { Format, Type } from "../../types/enums";

const executor = new QueueExecutor<{ id: string; type: Type; formats: Format[] }>("mapping-executor")
    .executor(async (data) => {
        const media = await loadMapping(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished mapping for media ${id.id}`)))
    .error((err, id) => console.error(colors.red(`Error occurred while mapping for media ${id.id}`), err))
    .interval(1000);
export default executor;
