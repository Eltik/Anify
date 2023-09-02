"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
const child_process_1 = __importDefault(require("child_process"));
const colors_1 = __importDefault(require("colors"));
const simulateLoadingDots = () => {
    const dots = ['.', '..', '...'];
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write("\x1B[?25l"); // Hide cursor
        process.stdout.write(colors_1.default.cyan(`Building${dots[i]}\r`));
        if (i === dots.length - 1) {
            i = 0;
        }
        else {
            i++;
        }
    }, 500);
    return interval;
};
const build = async (process) => {
    const child = child_process_1.default.spawn("npm", ["run", "build"], {
        cwd: `../${process}`,
        stdio: "pipe"
    });
    const loadingInterval = simulateLoadingDots();
    return new Promise((resolve, reject) => {
        let buildOutput = ""; // Variable to capture build output
        child.stdout?.on("data", (data) => {
            buildOutput += data.toString();
        });
        child.stderr?.on("data", (data) => {
            buildOutput += data.toString();
        });
        child.on("error", (error) => {
            clearInterval(loadingInterval);
            console.error(colors_1.default.red(`Error starting build process: ${error.message}\n`));
            resolve(false);
        });
        child.on("exit", (code) => {
            clearInterval(loadingInterval);
            if (code === 0) {
                console.log(colors_1.default.green("Build completed successfully\n"));
                resolve(true);
            }
            else {
                console.error(buildOutput); // Log the error output
                console.log(colors_1.default.red("Build failed. Please check the above for errors.\n"));
                resolve(false);
            }
        });
    });
};
exports.build = build;
