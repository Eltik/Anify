import { init } from "../database";

export const buildDB = async () => {
    await init();
};

buildDB();
