import { env } from "../../../env";
import { ProviderType } from "../../../types";
import type { IProxy, IProxyProviderMetrics } from "../../../types/impl/proxies";
import fs from "fs";
import path from "path";

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

// Add new constants for improved health scoring
const LATENCY_THRESHOLD_EXCELLENT = 200; // ms
const LATENCY_THRESHOLD_GOOD = 500; // ms
const LATENCY_THRESHOLD_FAIR = 1000; // ms
const SUCCESS_STREAK_BONUS = 1.5;
const MIN_REQUESTS_FOR_RELIABILITY = 10;
const RELIABILITY_WEIGHT = 0.2;
const ADAPTIVE_WEIGHT_THRESHOLD = 100; // Number of requests before adapting weights

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

// Helper function to convert proxy to URL string
export const proxyToUrl = (proxy: IProxy | null): string | null => {
    if (!proxy) return null;
    return `http://${proxy.ip}:${proxy.port}`;
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
            successStreak: 0,
            latencyScore: 50,
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
        metrics.successStreak = (metrics.successStreak || 0) + 1;

        // Calculate bonus based on success streak
        const streakBonus = Math.min(SUCCESS_STREAK_BONUS * Math.log10(metrics.successStreak + 1), SUCCESS_BONUS * 2);

        // Apply success bonus with streak consideration
        metrics.healthScore = Math.min(MAX_HEALTH_SCORE, metrics.healthScore + SUCCESS_BONUS + streakBonus);
        metrics.consecutiveFailures = 0;
    } else {
        metrics.lastFailureTime = now;
        metrics.consecutiveFailures = (metrics.consecutiveFailures || 0) + 1;
        metrics.successStreak = 0;

        // Progressive penalty based on consecutive failures
        const failurePenalty = FAILURE_PENALTY * Math.min(2, Math.pow(1.2, metrics.consecutiveFailures));
        metrics.healthScore = Math.max(MIN_HEALTH_SCORE, metrics.healthScore - failurePenalty);
    }

    // Update response time metrics with exponential moving average
    if (responseTime) {
        metrics.averageResponseTime = metrics.averageResponseTime ? metrics.averageResponseTime * 0.7 + responseTime * 0.3 : responseTime;

        // Calculate latency score (0-100)
        let latencyScore = 100;
        if (responseTime > LATENCY_THRESHOLD_FAIR) {
            latencyScore = 50;
        } else if (responseTime > LATENCY_THRESHOLD_GOOD) {
            latencyScore = 75;
        } else if (responseTime > LATENCY_THRESHOLD_EXCELLENT) {
            latencyScore = 90;
        }

        metrics.latencyScore = metrics.latencyScore ? metrics.latencyScore * 0.8 + latencyScore * 0.2 : latencyScore;
    }

    // Calculate reliability score based on total requests
    const reliabilityScore = metrics.totalRequests >= MIN_REQUESTS_FOR_RELIABILITY ? (metrics.successfulRequests / metrics.totalRequests) * 100 : 50; // Default score for new proxies

    // Adaptive weights based on request volume
    let adaptiveSuccessWeight = SUCCESS_RATE_WEIGHT;
    let adaptiveResponseWeight = RESPONSE_TIME_WEIGHT;
    let adaptiveReliabilityWeight = RELIABILITY_WEIGHT;

    if (metrics.totalRequests > ADAPTIVE_WEIGHT_THRESHOLD) {
        // Adjust weights based on performance patterns
        const successRate = metrics.successfulRequests / metrics.totalRequests;
        if (successRate > 0.9) {
            adaptiveResponseWeight *= 1.2; // Prioritize speed for reliable proxies
            adaptiveSuccessWeight *= 0.9;
        } else if (successRate < 0.7) {
            adaptiveSuccessWeight *= 1.2; // Prioritize success rate for unreliable proxies
            adaptiveResponseWeight *= 0.9;
        }

        // Normalize weights
        const totalWeight = adaptiveSuccessWeight + adaptiveResponseWeight + adaptiveReliabilityWeight;
        adaptiveSuccessWeight /= totalWeight;
        adaptiveResponseWeight /= totalWeight;
        adaptiveReliabilityWeight /= totalWeight;
    }

    // Calculate final health score components
    const successRateScore = metrics.successRate * 100;
    const responseTimeScore = metrics.latencyScore || 50;

    // Weighted health score calculation with reliability
    const targetScore = successRateScore * adaptiveSuccessWeight + responseTimeScore * adaptiveResponseWeight + reliabilityScore * adaptiveReliabilityWeight;

    // Smooth transition to target score
    metrics.healthScore += (targetScore - metrics.healthScore) * 0.1;

    // Ensure health score stays within bounds
    metrics.healthScore = Math.min(MAX_HEALTH_SCORE, Math.max(MIN_HEALTH_SCORE, metrics.healthScore));

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
