import init from "./init";

interface IResponse {
    error?: string;
    data: string;
}

const logs = async (names: string | number | (string | number)[]): Promise<IResponse[]> => {
    await init();

    if (!Array.isArray(names)) {
        names = [names];
    }

    return Promise.all(
        names.map((name) => {
            return new Promise<IResponse>(async (resolve, reject) => {
                // $HOME/.pm2/logs/XXX-err.log
                const logPath = `${process.env.HOME}/.pm2/logs/${name}-out.log`;
                const file = Bun.file(logPath);

                if (await file.exists()) {
                    const data = await (await file.text()).replaceAll(/\x1B\[\d{1,2}m/g, "");

                    if (data.length >= 4090) {
                        return resolve({ data: `\`\`\`${data.substring(data.length, data.length - 4090)}\`\`\`` });
                    }

                    resolve({ data: `\`\`\`${data}\`\`\`` });
                } else {
                    resolve({ error: "Log file not found. Path: " + logPath, data: name as string });
                }
            });
        })
    );
};

export default logs;
export { logs };
