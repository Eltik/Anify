import { ProviderType } from "../../../types";
import type { IProxy, IProxyProviderMetrics } from "../../../types/impl/proxies";
import fs from "fs";
import path from "path";
import { env } from "../../../env";

const MIN_HEALTH_SCORE = 0;
const MAX_HEALTH_SCORE = 100;
const FAILURE_PENALTY = 2;
const SUCCESS_BONUS = 3;
const RESPONSE_TIME_WEIGHT = 0.3;
const SUCCESS_RATE_WEIGHT = 0.7;
const MAX_CONSECUTIVE_FAILURES = 10;
const MIN_COOLDOWN_MS = 30000;
const MAX_COOLDOWN_MS = 1800000;
const HEALTH_DECAY_RATE = 0.98;
const MIN_VIABLE_HEALTH = 10;

export const proxyCache: {
    proxies: IProxy[];
    validProxies: Record<ProviderType, Record<string, IProxy[]>>;
} = {
    proxies: [],
    validProxies: Object.values(ProviderType).reduce(
        (acc, type) => {
            acc[type] = {};
            return acc;
        },
        {} as Record<ProviderType, Record<string, IProxy[]>>,
    ),
};

// Helper function to get provider metrics, creating if doesn't exist
const getProviderMetrics = (proxy: IProxy, providerType: ProviderType, providerId: string): IProxyProviderMetrics => {
    if (!proxy.providerMetrics) {
        proxy.providerMetrics = {} as Record<ProviderType, Record<string, IProxyProviderMetrics>>;
    }
    if (!proxy.providerMetrics[providerType]) {
        proxy.providerMetrics[providerType] = {};
    }
    if (!proxy.providerMetrics[providerType][providerId]) {
        proxy.providerMetrics[providerType][providerId] = {
            healthScore: 50,
            consecutiveFailures: 0,
            successRate: 0,
            averageResponseTime: 0,
            successfulRequests: 0,
            totalRequests: 0,
        };
    }
    return proxy.providerMetrics[providerType][providerId];
};

// Save proxies to provider-specific files
const saveProxiesToFile = (providerType: ProviderType) => {
    const filename = `${providerType}Proxies.json`;
    const filePath = path.join(process.cwd(), filename);

    // Get all proxies that have metrics for this provider type
    const providerProxies = proxyCache.proxies.filter((proxy) => proxy.providerMetrics?.[providerType] && Object.keys(proxy.providerMetrics[providerType]).length > 0);

    // Update validProxies cache for each provider
    Object.keys(proxyCache.validProxies[providerType]).forEach((providerId) => {
        // Keep all proxies that have metrics for this provider
        proxyCache.validProxies[providerType][providerId] = providerProxies.filter((proxy) => proxy.providerMetrics[providerType][providerId]);
    });

    // Save all proxies with their metrics
    fs.writeFileSync(filePath, JSON.stringify(providerProxies, null, 2));

    if (env.DEBUG) {
        const totalProxies = providerProxies.length;
        const healthyCount = providerProxies.filter((proxy) => Object.values(proxy.providerMetrics[providerType]).some((metrics) => metrics.healthScore > MIN_VIABLE_HEALTH)).length;
        const providerCounts = Object.entries(proxyCache.validProxies[providerType])
            .map(([id, proxies]) => `${id}: ${proxies.length}`)
            .join(", ");
        console.log(`Saved ${totalProxies} proxies for ${providerType} (${healthyCount} healthy) - Per provider: ${providerCounts}`);
    }
};

export const updateProxyHealth = (proxy: IProxy, success: boolean, providerType: ProviderType, providerId: string, responseTime?: number) => {
    const now = new Date();
    const metrics = getProviderMetrics(proxy, providerType, providerId);

    // Apply time-based health decay (only if not successful)
    if (!success && metrics.lastSuccessTime) {
        const lastSuccessDate = new Date(metrics.lastSuccessTime);
        const timeSinceLastUpdate = (now.getTime() - lastSuccessDate.getTime()) / (24 * 60 * 60 * 1000); // Days since last success
        metrics.healthScore *= Math.pow(HEALTH_DECAY_RATE, timeSinceLastUpdate);
    }

    // Update basic metrics
    metrics.totalRequests = (metrics.totalRequests || 0) + 1;

    if (success) {
        metrics.successfulRequests = (metrics.successfulRequests || 0) + 1;
        metrics.lastSuccessTime = now;

        // Reset consecutive failures and apply success bonus
        if (metrics.consecutiveFailures > 0) {
            // Extra bonus for breaking a failure streak
            const streakBonus = SUCCESS_BONUS * (1 + Math.min(2, metrics.consecutiveFailures / 2));
            metrics.healthScore = Math.min(MAX_HEALTH_SCORE, metrics.healthScore + streakBonus);
        } else {
            metrics.healthScore = Math.min(MAX_HEALTH_SCORE, metrics.healthScore + SUCCESS_BONUS);
        }
        metrics.consecutiveFailures = 0;
    } else {
        metrics.lastFailureTime = now;
        metrics.consecutiveFailures = (metrics.consecutiveFailures || 0) + 1;

        // Progressive penalty based on consecutive failures, but less aggressive
        const failurePenalty = FAILURE_PENALTY * Math.min(2, Math.pow(1.2, metrics.consecutiveFailures));
        metrics.healthScore = Math.max(MIN_HEALTH_SCORE, metrics.healthScore - failurePenalty);
    }

    // Update response time metrics with exponential moving average
    if (responseTime) {
        metrics.averageResponseTime = metrics.averageResponseTime ? metrics.averageResponseTime * 0.7 + responseTime * 0.3 : responseTime;
    }

    // Calculate success rate with more weight on recent results
    const recentWeight = 0.2; // Reduced from 0.3 for more stability
    metrics.successRate = metrics.successRate ? metrics.successRate * (1 - recentWeight) + (success ? recentWeight : 0) : success ? 1 : 0;

    // Calculate final health score components
    const responseTimeScore = responseTime
        ? Math.max(0, 100 - (responseTime / 1000) * 10) // Less aggressive response time penalty
        : metrics.averageResponseTime
          ? Math.max(0, 100 - (metrics.averageResponseTime / 1000) * 10)
          : 50;

    const successRateScore = metrics.successRate * 100;

    // Weighted health score adjustment (more gradual)
    const targetScore = responseTimeScore * RESPONSE_TIME_WEIGHT + successRateScore * SUCCESS_RATE_WEIGHT;
    metrics.healthScore += (targetScore - metrics.healthScore) * 0.1; // Reduced from 0.2 for more stability

    // Ensure health score stays within bounds
    metrics.healthScore = Math.min(MAX_HEALTH_SCORE, Math.max(MIN_HEALTH_SCORE, metrics.healthScore));

    if (env.DEBUG) {
        console.log(`Proxy ${proxy.ip}:${proxy.port} health updated - Score: ${metrics.healthScore.toFixed(2)}, Success Rate: ${(metrics.successRate * 100).toFixed(2)}%, Avg Response: ${metrics.averageResponseTime.toFixed(2)}ms`);
    }

    // Save updated proxies to file
    saveProxiesToFile(providerType);
};

export const selectProxy = (providerType: ProviderType, providerId: string): IProxy | null => {
    const providerProxies = proxyCache.validProxies[providerType]?.[providerId] || [];
    if (providerProxies.length === 0) return null;

    // Filter out proxies that are in cooldown or have too low health
    const now = Date.now();
    const viableProxies = providerProxies.filter((proxy) => {
        const metrics = getProviderMetrics(proxy, providerType, providerId);

        // Check if proxy is in cooldown
        if (metrics.lastFailureTime) {
            const cooldownTime = Math.min(MAX_COOLDOWN_MS, MIN_COOLDOWN_MS * Math.pow(2, metrics.consecutiveFailures));
            if (now - metrics.lastFailureTime.getTime() < cooldownTime) {
                return false;
            }
        }

        return metrics.healthScore > MIN_VIABLE_HEALTH && metrics.consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
    });

    if (viableProxies.length === 0) return null;

    // Sort by health score and select randomly from top proxies
    const sortedProxies = viableProxies.sort((a, b) => {
        const metricsA = getProviderMetrics(a, providerType, providerId);
        const metricsB = getProviderMetrics(b, providerType, providerId);
        return metricsB.healthScore - metricsA.healthScore;
    });

    // Select from top 30% of proxies, weighted by health score
    const topCount = Math.max(1, Math.ceil(sortedProxies.length * 0.3));
    const topProxies = sortedProxies.slice(0, topCount);

    // Weighted random selection based on health scores
    const totalHealth = topProxies.reduce((sum, p) => sum + getProviderMetrics(p, providerType, providerId).healthScore, 0);

    let random = Math.random() * totalHealth;
    for (const proxy of topProxies) {
        const health = getProviderMetrics(proxy, providerType, providerId).healthScore;
        if (random <= health) return proxy;
        random -= health;
    }

    return topProxies[0]; // Fallback to best proxy if weighted selection fails
};
