// 🌸 proxies/impl/manager.ts

import fs from "fs";
import path from "path";
import { ProviderType } from "../../types";

// 🗂️ Map each ProviderType to its proxy file
const PROXY_FILES: Record<ProviderType, string> = {
    [ProviderType.BASE]: "BASEProxies.json",
    [ProviderType.INFORMATION]: "INFORMATIONProxies.json",
    [ProviderType.MANGA]: "MANGAProxies.json",
    [ProviderType.META]: "METAProxies.json",
    [ProviderType.ANIME]: "",
};

function loadProxyFile(filename: string): string[] {
    if (!filename) return [];
    try {
        const filepath = path.resolve(process.cwd(), filename);
        const raw = fs.readFileSync(filepath, "utf-8");
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

// 🗂️ Lazily loaded proxy pool
const PROXY_POOL: Partial<Record<ProviderType, string[]>> = {};

function getPool(providerType: ProviderType): string[] {
    if (!PROXY_POOL[providerType]) {
        PROXY_POOL[providerType] = loadProxyFile(PROXY_FILES[providerType]);
    }
    return PROXY_POOL[providerType]!;
}

// 🔄 Round-robin index per provider instance
const roundRobinIndex: Map<string, number> = new Map();

/**
 * 🎯 Selects a proxy from the pool for the given provider type.
 * Uses round-robin per providerId to spread load evenly~
 */
export function selectProxy(providerType: ProviderType, providerId: string): string | null {
    const pool = getPool(providerType);
    if (pool.length === 0) return null;

    const key = `${providerType}:${providerId}`;
    const current = roundRobinIndex.get(key) ?? 0;
    const proxy = pool[current % pool.length];

    roundRobinIndex.set(key, current + 1);

    return proxy ?? null;
}

/**
 * 🔗 Converts a proxy string ("ip:port") to a full CORS Anywhere URL.
 * Returns null if no proxy provided~
 */
export function proxyToUrl(proxy: string | null): string | null {
    if (!proxy) return null;
    return `http://${proxy}`;
}