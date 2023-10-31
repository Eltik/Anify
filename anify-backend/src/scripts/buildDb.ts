import dotenv from "dotenv";
dotenv.config();

import { init } from "../database";

export const buildDB = async () => {
    await init();
};

buildDB();
