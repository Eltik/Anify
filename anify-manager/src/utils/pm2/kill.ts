import { runningProcesses } from ".";

interface IResponse {
    error?: string;
    data: string;
}

const kill = async (names: string | number | (string | number)[]): Promise<IResponse[]> => {
    if (!Array.isArray(names)) {
        names = [names];
    }

    return Promise.all(
        names.map((name) => {
            return new Promise<IResponse>((resolve, reject) => {
                runningProcesses.get(String(name))?.kill();
                resolve({ data: `killed ${name}` });
            });
        })
    );
};

export default kill;
export { kill };
