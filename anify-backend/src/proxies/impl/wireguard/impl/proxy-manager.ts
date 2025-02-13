import { WireGuardManager } from "./wireguard";
import * as path from "path";
import * as fs from "fs/promises";
import type { IWireguardConfig } from "../../../../types/impl/proxies/impl/wireguard";

export class ProxyManager {
    private wgManager: WireGuardManager;
    private configsPath: string;
    private configs: IWireguardConfig[] = [];
    private currentConfig: string | null = null;
    private isConnecting: boolean = false;
    private isDisconnecting: boolean = false;

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
     * Connect to WireGuard with proper state management
     */
    async connect(name?: string): Promise<void> {
        if (this.isConnecting) {
            console.warn("Connection already in progress, skipping");
            return;
        }

        try {
            this.isConnecting = true;

            // If we're already connected to this config, just verify
            if (name && name === this.currentConfig) {
                const status = await this.wgManager.getStatus();
                if (status && status.includes(name)) {
                    return;
                }
            }

            // Disconnect first if needed
            if (this.currentConfig) {
                await this.disconnect();
            }

            if (name) {
                await this.wgManager.connect(name);
                this.currentConfig = name;
            } else {
                // Pick a random config if no name provided
                const availableConfigs = this.configs.filter((c) => !c.active);
                if (availableConfigs.length > 0) {
                    const randomConfig = availableConfigs[Math.floor(Math.random() * availableConfigs.length)];
                    await this.wgManager.connect(randomConfig.name);
                    this.currentConfig = randomConfig.name;
                } else {
                    throw new Error("No available WireGuard configurations");
                }
            }
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect from WireGuard with proper state management
     */
    async disconnect(): Promise<void> {
        if (this.isDisconnecting || !this.currentConfig) {
            return;
        }

        try {
            this.isDisconnecting = true;
            await this.wgManager.disconnect();
            this.currentConfig = null;
        } finally {
            this.isDisconnecting = false;
        }
    }

    /**
     * Rotate to a new proxy configuration
     */
    async rotate(): Promise<void> {
        if (this.isConnecting || this.isDisconnecting) {
            console.warn("Connection operation in progress, skipping rotation");
            return;
        }

        const availableConfigs = this.configs.filter((c) => !c.active);
        if (availableConfigs.length === 0) {
            console.warn("No available configs to rotate to");
            return;
        }

        const nextConfig = availableConfigs[Math.floor(Math.random() * availableConfigs.length)];
        await this.connect(nextConfig.name);
    }

    /**
     * Get current proxy configuration
     */
    async getCurrentConfig(): Promise<IWireguardConfig | null> {
        if (!this.currentConfig) return null;
        return this.configs.find((config) => config.name === this.currentConfig) || null;
    }

    /**
     * Get all available proxy configurations
     */
    getConfigs(): IWireguardConfig[] {
        return [...this.configs];
    }
}
