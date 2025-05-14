import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const deployProxy = async () => {
    try {
        console.log("Deploying Cloudflare proxy...");
        // Assuming the proxy to deploy is always the one at src/proxies/impl/cloudflare/index.js
        // and that the wrangler.toml is configured for this worker.

        // Execute wrangler deploy command
        // The command needs to be run from the directory containing wrangler.toml or specify the config path
        // For simplicity, let's assume wrangler.toml is in the proxyDir or its parent for the worker.
        // Cloudflare workers are typically deployed from their specific directory or by specifying the entry point.
        // Let's assume the worker is named "cloudflare-proxy" in wrangler.toml
        const output = execSync("wrangler deploy src/proxies/impl/cloudflare/index.js --name cloudflare-proxy", { encoding: "utf-8", cwd: process.cwd() });
        console.log("Deployment output:\n", output);

        // Extract the URL from the output
        // Wrangler's output for a successful deploy usually includes a line like:
        // Published cloudflare-proxy (version 0.0.1) to https://cloudflare-proxy.<your-account>.workers.dev
        // New format example from user:
        // Deployed anify-proxy triggers (0.23 sec)
        //   https://anify-proxy.eltik.workers.dev
        const urlMatch = output.match(/\s+(https:\/\/[a-zA-Z0-9.-]+\.workers\.dev)/m);

        if (urlMatch && urlMatch[1]) {
            const deployedUrl = urlMatch[1];
            console.log(`Successfully deployed. Proxy URL: ${deployedUrl}`);

            // Store the URL in the .env file at anify-backend/.env
            const envPath = path.join(process.cwd(), ".env");
            const envLine = `\nPROXY_URL=${deployedUrl}`;

            if (fs.existsSync(envPath)) {
                // Append if .env exists
                fs.appendFileSync(envPath, envLine);
                console.log(`Appended PROXY_URL to ${envPath}`);
            } else {
                // Create .env if it doesn't exist
                fs.writeFileSync(envPath, envLine.trimStart()); // trimStart to remove leading newline if file is new
                console.log(`Created ${envPath} and added PROXY_URL.`);
            }

            // Append the target parameter for easy use
            const fullProxyAccessUrl = `${deployedUrl}?target=`;
            const envTargetLine = `\nFULL_PROXY_ACCESS_URL=${fullProxyAccessUrl}`;

            // Check existence again for the second append, though ideally the file exists now.
            if (fs.existsSync(envPath)) {
                fs.appendFileSync(envPath, envTargetLine);
                console.log(`Appended FULL_PROXY_ACCESS_URL to ${envPath}`);
            } else {
                // This case should not be reached if the first write/append was successful.
                fs.writeFileSync(envPath, `${envLine.trimStart()}${envTargetLine}`);
                console.log(`Created ${envPath} and added PROXY_URL and FULL_PROXY_ACCESS_URL.`);
            }
        } else {
            console.error("Could not find deployed URL in wrangler output.");
            console.error("Please check wrangler output and adjust the URL matching regex in deployProxy.ts if necessary.");
        }
    } catch (error) {
        console.error("Failed to deploy Cloudflare proxy:", error);
        if (error instanceof Error && "stdout" in error) {
            console.error("STDOUT:", (error as any).stdout?.toString());
        }
        if (error instanceof Error && "stderr" in error) {
            console.error("STDERR:", (error as any).stderr?.toString());
        }
    }
};

export default deployProxy;
