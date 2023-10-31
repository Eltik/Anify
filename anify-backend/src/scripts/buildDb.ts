import dotenv from "dotenv";
dotenv.config();

import { init } from "../database";

export const buildDB = async () => {
    await init();
    console.log("Successfully built database.");
    process.exit(0);
};

buildDB();
