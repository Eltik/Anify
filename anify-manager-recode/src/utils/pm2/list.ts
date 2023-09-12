import pm2 from "pm2";
import initalizePm2 from "./initalizePm2";

export interface IResponse extends Object {
    error?: string;
    data: {
        name?: string;
        pid?: number;
    }[];
}

const list = async (): Promise<IResponse> => {
    await initalizePm2();
    return new Promise((resolve, reject) => {
        pm2.list((err, list) => {
            if (err) {
                console.error(err);
                return resolve({ error: err.message, data: [] });
            }

            resolve({ data: list.map((x) => ({ name: x.name, pid: x.pid })) });
        });
    });
};

export default list;
export { list };
