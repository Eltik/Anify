import { init } from "./database";
import { start } from "./server";

init().then(async () => {
    await start();
});
