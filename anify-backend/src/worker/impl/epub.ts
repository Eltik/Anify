import colors from "colors";
import QueueExecutor from "../../lib/executor";
import { Chapter } from "../../types/types";
import { loadEpub } from "../../lib/impl/epub";

const executor = new QueueExecutor<{ id: string; providerId: string; chapters: Chapter[] }>("novel-upload-executor")
    .executor(async (data) => {
        const media = await loadEpub(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished uploading novel for ${id.providerId}.`)))
    .error((err, id) => console.error(colors.red(`Error occurred while uploading novel for ${id.providerId}`), err))
    .interval(1000);
export default executor;
