import { ProxyManager } from "./impl/proxy-manager";

/**
 * @description WireGuard proxy manager
 */
export const wireguardProxyManager = new ProxyManager();

// Track current connection state
let isDisconnecting = false;
let currentConnection: string | null = null;

export const init = async () => {
    await wireguardProxyManager.init();
    await wireguardProxyManager.connect();
};

// Ensure clean disconnection
const disconnect = async () => {
    if (isDisconnecting || !currentConnection) return;

    try {
        isDisconnecting = true;
        await wireguardProxyManager.disconnect();
        currentConnection = null;
    } finally {
        isDisconnecting = false;
    }
};

// Handle process termination
process.on("SIGINT", async () => {
    await disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await disconnect();
    process.exit(0);
});

process.on("uncaughtException", async (error) => {
    console.error(error);
    await disconnect();
    process.exit(1);
});

process.on("exit", async () => {
    await disconnect();
});
