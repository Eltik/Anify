import pm2 from "pm2";

let pm2Initilized: boolean = false;

export default (): Promise<void> => {
    if (pm2Initilized) return Promise.resolve();
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            pm2Initilized = true;
            resolve();
        });
    });
};
