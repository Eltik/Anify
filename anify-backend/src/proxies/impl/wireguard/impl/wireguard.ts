import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import type { IWireguardConfig } from "../../../../types/impl/proxies/impl/wireguard";

const execAsync = promisify(exec);

export class WireGuardManager {
    private configDir: string;
    private currentConfig: string | null = null;

    constructor(configDir: string) {
        this.configDir = configDir;
    }

    /**
     * Initialize WireGuard configuration directory
     */
    async init(): Promise<void> {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
        } catch (error) {
            console.error("Error creating config directory:", error);
            throw error;
        }
    }

    /**
     * Add a new WireGuard configuration
     */
    async addConfig(name: string, config: string): Promise<void> {
        const configPath = path.join(this.configDir, `${name}.conf`);
        try {
            await fs.writeFile(configPath, config);
        } catch (error) {
            console.error("Error adding configuration:", error);
            throw error;
        }
    }

    /**
     * List all available configurations
     */
    async listConfigs(): Promise<string[]> {
        try {
            const files = await fs.readdir(this.configDir);
            return files.filter((file) => file.endsWith(".conf"));
        } catch (error) {
            console.error("Error listing configurations:", error);
            throw error;
        }
    }

    /**
     * Check if a specific WireGuard configuration is already connected
     */
    public async isConnected(endpoint: string): Promise<boolean> {
        try {
            // Get detailed WireGuard status
            const { stdout } = await execAsync("sudo wg show all");

            const config = this.parseStatus(stdout);

            // If we find the config name in the output, it means it's connected
            return config.endpoint === endpoint;
        } catch (error) {
            console.error("Error checking if connected:", error);
            // If the command fails, assume we're not connected
            return false;
        }
    }

    private parseStatus(status: string): IWireguardConfig {
        const lines = status.split("\n");
        const config: IWireguardConfig = {
            publicKey: "",
            endpoint: "",
            allowedIPs: "",
            privateKey: "",
            address: "",
            dns: "",
            name: "",
            active: false,
        };

        for (const line of lines) {
            if (line.includes("public key")) {
                config.publicKey = line.match(/public key: (.*)/)?.[1] ?? "";
            }
            if (line.includes("endpoint")) {
                config.endpoint = line.match(/endpoint: (.*)/)?.[1] ?? "";
            }
            if (line.includes("allowed ips")) {
                config.allowedIPs = line.match(/allowed ips: (.*)/)?.[1] ?? "";
            }
            if (line.includes("address")) {
                config.address = line.match(/address: (.*)/)?.[1] ?? "";
            }
            if (line.includes("dns")) {
                config.dns = line.match(/dns: (.*)/)?.[1] ?? "";
            }
        }

        return config;
    }

    private async loadConfig(configPath: string): Promise<IWireguardConfig> {
        const file = Bun.file(configPath);
        if (!(await file.exists())) {
            throw new Error(`Config file ${configPath} does not exist`);
        }

        const configContent = await file.text();

        const config = {
            privateKey: configContent.match(/PrivateKey = (.*)/)?.[1],
            address: configContent.match(/Address = (.*)/)?.[1],
            dns: configContent.match(/DNS = (.*)/)?.[1],
            publicKey: configContent.match(/PublicKey = (.*)/)?.[1],
            allowedIPs: configContent.match(/AllowedIPs = (.*)/)?.[1],
            endpoint: configContent.match(/Endpoint = (.*)/)?.[1],
            name: path.basename(configPath),
            active: false,
        } as IWireguardConfig;

        return config;
    }

    /**
     * Connect to a specific WireGuard configuration
     */
    async connect(configName: string): Promise<void> {
        // Add .conf extension if it doesn't already exist
        const configWithExt = configName.endsWith(".conf") ? configName : `${configName}.conf`;
        const configPath = path.join(this.configDir, configWithExt);
        const configNameWithoutExt = configWithExt.replace(".conf", "");

        const config = await this.loadConfig(configPath);

        try {
            // Check if already connected
            if (await this.isConnected(config.endpoint)) {
                console.log(`Already connected to ${configNameWithoutExt}, reconnecting...`);
                await this.disconnect();
            }

            await execAsync(`sudo wg-quick up ${configPath}`);
            this.currentConfig = configName;
            console.log(`Connected to ${configName}`);
        } catch (error) {
            console.error("Error connecting to WireGuard:", error);
            throw error;
        }
    }

    /**
     * Disconnect from current WireGuard configuration
     */
    async disconnect(): Promise<void> {
        try {
            // Get process IDs for wireguard processes
            const { stdout } = await execAsync(`ps aux | grep wireguard | grep -v grep | awk '{print $2}'`);

            // Split the output into individual process IDs and filter out empty strings
            const processIds = stdout.split("\n").filter((id) => id.trim());

            // Kill each process ID
            for (const pid of processIds) {
                try {
                    await execAsync(`sudo kill -9 ${pid}`);
                } catch (error) {
                    console.error(`Error killing process ${pid}:`, error);
                }
            }

            console.log(`Disconnected from ${this.currentConfig}`);
            this.currentConfig = null;
        } catch (error) {
            console.error("Error disconnecting from WireGuard:", error);
            throw error;
        }
    }

    /**
     * Rotate IP by randomly switching between available configurations
     */
    async rotateIP(): Promise<void> {
        try {
            const configs = await this.listConfigs();
            if (configs.length === 0) {
                throw new Error("No configurations available");
            }

            // If connected, disconnect first
            if (this.currentConfig) {
                await this.disconnect();
            }

            // Filter out the current config and select a random one from the remaining configs
            const availableConfigs = configs.filter(
                (config) => config !== `${this.currentConfig}.conf` && config !== this.currentConfig && config.endsWith(".conf"), // Ensure we only select .conf files
            );

            if (availableConfigs.length === 0) {
                throw new Error("No other configurations available for rotation");
            }

            // Select random config
            const randomIndex = Math.floor(Math.random() * availableConfigs.length);
            const nextConfig = availableConfigs[randomIndex].replace(".conf", "");

            // Connect to randomly selected configuration
            await this.connect(nextConfig);
        } catch (error) {
            console.error("Error rotating IP:", error);
            throw error;
        }
    }

    /**
     * Get current WireGuard status
     */
    async getStatus(): Promise<string> {
        try {
            const { stdout } = await execAsync("sudo wg show");
            return stdout;
        } catch (error) {
            console.error("Error getting WireGuard status:", error);
            throw error;
        }
    }

    /**
     * Get the private key for the WireGuard configuration
     */
    async getPrivateKey(): Promise<string> {
        const configPath = path.join(this.configDir, `${this.currentConfig}.conf`);
        const config = await fs.readFile(configPath, "utf8");
        const privateKeyMatch = config.match(/PrivateKey = (\S+)/);
        if (!privateKeyMatch) {
            throw new Error("Private key not found in configuration");
        }
        return privateKeyMatch[1];
    }

    /**
     * Get the public key for the WireGuard configuration
     */
    async getPublicKey(): Promise<string> {
        const configPath = path.join(this.configDir, `${this.currentConfig}.conf`);
        const config = await fs.readFile(configPath, "utf8");
        const publicKeyMatch = config.match(/PublicKey = (\S+)/);
        if (!publicKeyMatch) {
            throw new Error("Public key not found in configuration");
        }
        return publicKeyMatch[1];
    }
}
