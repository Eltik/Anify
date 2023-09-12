import pm2 from "pm2";
import initalizePm2 from "./initalizePm2";

interface IResponse {
    error?: string;
    data: string;
}

const kill = async (names: string | number | (string | number)[]): Promise<IResponse[]> => {
    await initalizePm2();

    if (!Array.isArray(names)) {
        names = [names];
    }

    return Promise.all(
        names.map((name) => {
            return new Promise<IResponse>((resolve, reject) => {
                pm2.delete(name, (err, results) => {
                    if (err) {
                        resolve({ error: err.message as string, data: name as string });
                    } else {
                        resolve({ data: "success" });
                    }
                });
            });
        })
    );
};

export default kill;
export { kill };
