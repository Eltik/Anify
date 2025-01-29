import { ProviderType } from "../../../types";
import type { IProxy, IProxyProviderMetrics } from "../../../types/impl/proxies";
import fs from "fs";
import path from "path";

const MIN_HEALTH_SCORE = 0;
const MAX_HEALTH_SCORE = 100;
const FAILURE_PENALTY = 10;
const SUCCESS_BONUS = 5;
const RESPONSE_TIME_WEIGHT = 0.3;
const SUCCESS_RATE_WEIGHT = 0.7;

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
            healthScore: 50, // Default starting score
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

    // Get all proxies for this provider type
    const providerProxies = proxyCache.proxies.filter((proxy) => proxy.providerMetrics?.[providerType] && Object.values(proxy.providerMetrics[providerType]).some((metrics) => metrics.healthScore > MIN_HEALTH_SCORE));

    fs.writeFileSync(filePath, JSON.stringify(providerProxies, null, 2));
};

export const updateProxyHealth = (proxy: IProxy, success: boolean, providerType: ProviderType, providerId: string, responseTime?: number) => {
    const now = new Date();
    const metrics = getProviderMetrics(proxy, providerType, providerId);

    // Update basic metrics
    metrics.totalRequests = (metrics.totalRequests || 0) + 1;
    if (success) {
        metrics.successfulRequests = (metrics.successfulRequests || 0) + 1;
        metrics.lastSuccessTime = now;
        metrics.consecutiveFailures = 0;
    } else {
        metrics.lastFailureTime = now;
        metrics.consecutiveFailures = (metrics.consecutiveFailures || 0) + 1;
    }

    // Update response time metrics
    if (responseTime) {
        metrics.averageResponseTime = metrics.averageResponseTime
            ? metrics.averageResponseTime * 0.8 + responseTime * 0.2 // Weighted moving average
            : responseTime;
    }

    // Calculate success rate
    metrics.successRate = metrics.successfulRequests / metrics.totalRequests;

    // Calculate health score
    const responseTimeScore = responseTime
        ? Math.max(0, 100 - (responseTime / 1000) * 10) // Penalize response times over 10 seconds
        : 50; // Default score if no response time

    const successRateScore = metrics.successRate * 100;

    metrics.healthScore = Math.min(MAX_HEALTH_SCORE, Math.max(MIN_HEALTH_SCORE, (metrics.healthScore || 50) + (success ? SUCCESS_BONUS : -FAILURE_PENALTY) + (responseTimeScore * RESPONSE_TIME_WEIGHT + successRateScore * SUCCESS_RATE_WEIGHT - metrics.healthScore) * 0.2));

    // Save updated proxies to file
    saveProxiesToFile(providerType);
};

export const selectProxy = (providerType: ProviderType, providerId: string): IProxy | null => {
    const providerProxies = proxyCache.validProxies[providerType]?.[providerId] || [];
    if (providerProxies.length === 0) return null;

    // Filter out proxies that have failed too many times consecutively
    const viableProxies = providerProxies.filter((proxy) => {
        const metrics = getProviderMetrics(proxy, providerType, providerId);
        return (metrics.consecutiveFailures || 0) < 3 && (metrics.healthScore || 0) > MIN_HEALTH_SCORE;
    });

    if (viableProxies.length === 0) return null;

    // Sort by health score and select randomly from top 20%
    const sortedProxies = viableProxies.sort((a, b) => {
        const metricsA = getProviderMetrics(a, providerType, providerId);
        const metricsB = getProviderMetrics(b, providerType, providerId);
        return (metricsB.healthScore || 0) - (metricsA.healthScore || 0);
    });

    const topProxies = sortedProxies.slice(0, Math.max(1, Math.ceil(sortedProxies.length * 0.2)));
    return topProxies[Math.floor(Math.random() * topProxies.length)];
};

// Cooling off period management
export const shouldRetryProxy = (proxy: IProxy, providerType: ProviderType, providerId: string): boolean => {
    const metrics = getProviderMetrics(proxy, providerType, providerId);
    if (!metrics.lastFailureTime) return true;

    const cooloffPeriod = Math.min(
        1800000, // Max 30 minutes
        Math.pow(2, metrics.consecutiveFailures || 0) * 1000, // Exponential backoff
    );

    return Date.now() - metrics.lastFailureTime.getTime() >= cooloffPeriod;
};
