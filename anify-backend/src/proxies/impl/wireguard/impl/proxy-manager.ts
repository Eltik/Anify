import { WireGuardManager } from "./wireguard";
import * as path from "path";
import * as fs from "fs/promises";
import type { IWireguardConfig } from "../../../../types/impl/proxies/impl/wireguard";

export class ProxyManager {
    private wgManager: WireGuardManager;
    private configsPath: string;
    private configs: IWireguardConfig[] = [];

    constructor() {
        this.configsPath = path.join(process.cwd(), "configs");
        this.wgManager = new WireGuardManager(this.configsPath);
    }

    /**
     * Initialize the proxy manager
     */
    async init(): Promise<void> {
        await this.wgManager.init();
        await this.readConfigs();
    }

    /**
     * Read and parse proxy configurations
     */
    async readConfigs() {
        const configsDir = path.join(process.cwd(), process.env.CONFIGS_DIR || "configs");
        const configs = await fs.readdir(configsDir);
        this.configs = await Promise.all(
            configs.map(async (config) => {
                const loadedConfig = await this.loadConfig(path.join(configsDir, config));
                this.configs.push(loadedConfig);
                return loadedConfig;
            }),
        );

        await this.rotate();
    }

    async loadConfig(configPath: string): Promise<IWireguardConfig> {
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
     * Add a new proxy configuration
     */
    async addProxy(config: IWireguardConfig): Promise<void> {
        // Save JSON config
        const jsonPath = path.join(this.configsPath, `${config.name}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(config, null, 2));

        // Add to WireGuard
        await this.wgManager.addConfig(config.name, JSON.stringify(config, null, 2));

        this.configs.push(config);
    }

    /**
     * Get current proxy configuration
     */
    async getCurrentConfig(): Promise<IWireguardConfig | null> {
        const status = await this.wgManager.getStatus();
        if (!status) return null;

        return this.configs.find((config) => status.includes(config.publicKey) || status.includes(config.privateKey)) || null;
    }

    /**
     * Rotate to next proxy
     */
    async rotate(): Promise<void> {
        await this.wgManager.rotateIP();
    }

    /**
     * Connect to a specific proxy
     */
    async connect(name?: string): Promise<void> {
        if (name) {
            await this.wgManager.connect(name);
        } else {
            const currentConfig = await this.getCurrentConfig();
            if (currentConfig) {
                await this.wgManager.connect(currentConfig.name);
            } else {
                throw new Error("No proxy configuration found");
            }
        }
    }

    /**
     * Disconnect current proxy
     */
    async disconnect(): Promise<void> {
        await this.wgManager.disconnect();
    }

    /**
     * Get all available proxy configurations
     */
    getConfigs(): IWireguardConfig[] {
        return [...this.configs];
    }
}
