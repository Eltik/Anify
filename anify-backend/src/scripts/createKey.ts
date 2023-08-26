import dotenv from "dotenv";
dotenv.config();

import { createKey } from "../keys";

createKey().then((data) => {
    console.log(data);
    process.exit(0);
});
