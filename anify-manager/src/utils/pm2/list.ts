import { runningProcesses } from ".";

export interface IResponse extends Object {
    error?: string;
    data: {
        name?: string;
        pid?: number;
    }[];
}

const list = async (): Promise<IResponse> => {
    return new Promise((resolve, reject) => {
        const data = Array.from(runningProcesses.keys()).map((x) => {
            if (!x) return;
            return { name: x, pid: runningProcesses.get(x)?.pid }
        }).filter((x) => x) as any;

        // Also get all processes that use node

        resolve({ data });
    });
};

export default list;
export { list };
