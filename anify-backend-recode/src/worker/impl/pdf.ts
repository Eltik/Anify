import colors from "colors";
import QueueExecutor from "../../lib/executor";
import { Chapter, Page } from "../../types/types";
import { loadPDF } from "../../lib/impl/pdf";

const executor = new QueueExecutor<{ id: string; providerId: string; chapter: Chapter; pages: string | Page[] }>("page-upload-executor")
    .executor(async (data) => {
        const media = await loadPDF(data);
        return media;
    })
    .callback((id) => console.debug(colors.green(`Finished uploading pages for ${id.chapter.id}.`)))
    .error((err, id) => console.error(colors.red(`Error occurred while uploading pages for ${id.chapter.id}`), err))
    .interval(1000);
export default executor;
