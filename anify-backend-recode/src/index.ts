import dotenv from "dotenv";
dotenv.config();

import { search } from "./database/impl/search";
import { Type } from "./types/enums";
import { init } from "./database";

init().then((data) => {
    search("Mushoku Tensei", Type.ANIME, [], 0, 10).then(console.log)
})