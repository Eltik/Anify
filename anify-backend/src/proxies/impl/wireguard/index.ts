import { ProxyManager } from "./impl/proxy-manager";

/**
 * @description WireGuard proxy manager
 */
export const wireguardProxyManager = new ProxyManager();

export const init = async () => {
    await wireguardProxyManager.init();
    await wireguardProxyManager.connect();
};

process.on("SIGINT", async () => {
    await wireguardProxyManager.disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await wireguardProxyManager.disconnect();
    process.exit(0);
});

process.on("uncaughtException", async (error) => {
    console.error(error);
    await wireguardProxyManager.disconnect();
    process.exit(1);
});

process.on("exit", async () => {
    await wireguardProxyManager.disconnect();
});
