import { Process } from "../types";
import childProcess from "child_process";
import colors from "colors";

const simulateLoadingDots = () => {
    const dots = ['.', '..', '...'];
    let i = 0;

    const interval = setInterval(() => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write("\x1B[?25l"); // Hide cursor
        process.stdout.write(colors.cyan(`Building${dots[i]}\r`));

        if (i === dots.length - 1) {
            i = 0;
        } else {
            i++;
        }

    }, 500);

    return interval;
};
  

export const build = async (process: Process) => {
    const child = childProcess.spawn("npm", ["run", "build"], {
        cwd: `../${process}`
    });

    const loadingInterval = simulateLoadingDots();

    await new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("exit", (code) => {
            clearInterval(loadingInterval);

            if (code === 0) {
                console.log(colors.green("Build completed successfully\n"));
                resolve(true);
            } else {
                console.log(colors.red("Build failed. Please check the console for errors.\n"));
            }
        });
    });
};