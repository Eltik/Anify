import QueueExecutor from "../helper/queue";
import colors from "colors";
import { Chapter, Page } from "../mapping/impl/manga";
import { uploadPages } from "../lib/upload";

const executor = new QueueExecutor<{ id: string; providerId: string; chapter: Chapter; readId: string; pages: Page[] }>("page-upload-executor")
    .executor(async (data) => {
        const media = await uploadPages(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished uploading pages for ${id.readId}.`)))
    .error((err, id) => console.error(colors.red(`Error occurred while uploading pages for ${id.readId}`), err))
    .interval(1000);
export default executor;
