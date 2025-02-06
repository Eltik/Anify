import { ProviderType } from "../../../types";
import type { IProxy, IProxyProviderMetrics } from "../../../types/impl/proxies";
import fs from "fs";
import path from "path";

const MIN_HEALTH_SCORE = 0;
const MAX_HEALTH_SCORE = 100;
const FAILURE_PENALTY = 3;
const SUCCESS_BONUS = 2;
const RESPONSE_TIME_WEIGHT = 0.25;
const SUCCESS_RATE_WEIGHT = 0.75;
const MAX_CONSECUTIVE_FAILURES = 5;
const MIN_COOLDOWN_MS = 60000;
const MAX_COOLDOWN_MS = 3600000;
const HEALTH_DECAY_RATE = 0.95;
const MIN_VIABLE_HEALTH = 20;

// Add new constants for improved health scoring
const LATENCY_THRESHOLD_EXCELLENT = 300;
const LATENCY_THRESHOLD_GOOD = 800;
const LATENCY_THRESHOLD_FAIR = 1500;
const SUCCESS_STREAK_BONUS = 1.2;
const MIN_REQUESTS_FOR_RELIABILITY = 5;
const RELIABILITY_WEIGHT = 0.3;
const ADAPTIVE_WEIGHT_THRESHOLD = 50;

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
        proxy.providerMetrics = {} as Record<string, IProxyProviderMetrics>;
    }
    if (!proxy.providerMetrics[providerId]) {
        proxy.providerMetrics[providerId] = {
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
    return proxy.providerMetrics[providerId];
};

// Save proxies to provider-specific files
const saveProxiesToFile = (providerType: ProviderType) => {
    // Convert providerType to uppercase for ANIME, MANGA, etc.
    const filename = `${providerType.toUpperCase()}Proxies.json`;
    const filePath = path.join(process.cwd(), filename);

    // Read existing proxies from file
    let existingProxies: IProxy[] = [];
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            existingProxies = JSON.parse(fileContent);
        }
    } catch (error) {
        console.error(`Error reading existing proxies from ${filename}:`, error);
    }

    // Create a map of existing proxies for easy lookup
    const existingProxyMap = new Map(existingProxies.map((proxy) => [`${proxy.ip}:${proxy.port}`, proxy]));

    // Update or add proxies from cache
    proxyCache.proxies.forEach((proxy) => {
        const proxyKey = `${proxy.ip}:${proxy.port}`;
        // Check if proxy has metrics for any provider ID in this provider type
        const hasMetricsForType = Object.keys(proxyCache.validProxies[providerType]).some((providerId) => proxy.providerMetrics?.[providerId]);

        if (hasMetricsForType) {
            // If proxy exists in file, merge the metrics
            const existingProxy = existingProxyMap.get(proxyKey);
            if (existingProxy) {
                existingProxyMap.set(proxyKey, {
                    ...existingProxy,
                    providerMetrics: {
                        ...existingProxy.providerMetrics,
                        ...proxy.providerMetrics, // Merge all provider metrics
                    },
                });
            } else {
                // Add new proxy
                existingProxyMap.set(proxyKey, proxy);
            }
        }
    });

    // Convert map back to array
    const updatedProxies = Array.from(existingProxyMap.values());

    // Update validProxies cache for each provider
    Object.keys(proxyCache.validProxies[providerType]).forEach((providerId) => {
        proxyCache.validProxies[providerType][providerId] = updatedProxies.filter((proxy) => proxy.providerMetrics?.[providerId] && proxy.providerMetrics[providerId].healthScore > MIN_VIABLE_HEALTH);
    });

    // Save all proxies with their metrics
    fs.writeFileSync(filePath, JSON.stringify(updatedProxies, null, 2));
};

export const updateProxyHealth = (proxy: IProxy, success: boolean, providerType: ProviderType, providerId: string, responseTime?: number) => {
    const now = Date.now();
    const metrics = getProviderMetrics(proxy, providerType, providerId);

    // Apply time-based health decay (only if not successful)
    if (!success && metrics.lastSuccessTime) {
        const timeSinceLastUpdate = (now - metrics.lastSuccessTime) / (24 * 60 * 60 * 1000); // Days since last success
        metrics.healthScore *= Math.pow(HEALTH_DECAY_RATE, timeSinceLastUpdate);
    }

    // Update basic metrics
    metrics.totalRequests = (metrics.totalRequests || 0) + 1;
    metrics.successfulRequests = (metrics.successfulRequests || 0) + (success ? 1 : 0);

    // Update success rate with exponential moving average for stability
    const currentSuccessRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
    metrics.successRate =
        metrics.successRate !== undefined
            ? metrics.successRate * 0.75 + currentSuccessRate * 0.25 // 75% old rate, 25% new rate
            : currentSuccessRate;

    if (success) {
        metrics.lastSuccessTime = now;
        metrics.successStreak = (metrics.successStreak || 0) + 1;

        // Calculate streak bonus with diminishing returns
        const streakBonus = Math.min(SUCCESS_STREAK_BONUS * Math.log10(metrics.successStreak + 1), SUCCESS_BONUS * 2);

        // Calculate success bonus based on response time
        let speedBonus = 0;
        if (responseTime) {
            if (responseTime < LATENCY_THRESHOLD_EXCELLENT) {
                speedBonus = SUCCESS_BONUS * 0.5; // 50% bonus for excellent speed
            } else if (responseTime < LATENCY_THRESHOLD_GOOD) {
                speedBonus = SUCCESS_BONUS * 0.3; // 30% bonus for good speed
            }
        }

        // Apply success bonus with streak and speed consideration
        const totalBonus = SUCCESS_BONUS + streakBonus + speedBonus;
        metrics.healthScore = Math.min(MAX_HEALTH_SCORE, metrics.healthScore + totalBonus);
        metrics.consecutiveFailures = 0;
    } else {
        metrics.lastFailureTime = now;
        metrics.consecutiveFailures = (metrics.consecutiveFailures || 0) + 1;
        metrics.successStreak = 0;

        // Progressive penalty based on consecutive failures and response time
        let failurePenalty = FAILURE_PENALTY * Math.min(2, Math.pow(1.2, metrics.consecutiveFailures));

        // Additional penalty for slow response times that led to failure
        if (responseTime && responseTime > LATENCY_THRESHOLD_FAIR) {
            failurePenalty *= 1.5; // 50% more penalty for slow failures
        }

        metrics.healthScore = Math.max(MIN_HEALTH_SCORE, metrics.healthScore - failurePenalty);
    }

    // Update response time metrics with exponential moving average
    if (responseTime) {
        // Use different weights based on success/failure
        const oldWeight = success ? 0.75 : 0.25; // Weight history more on success
        const newWeight = 1 - oldWeight;

        metrics.averageResponseTime = metrics.averageResponseTime ? metrics.averageResponseTime * oldWeight + responseTime * newWeight : responseTime;

        // Calculate latency score (0-100) with more granular scaling
        let latencyScore = 100;
        if (responseTime > LATENCY_THRESHOLD_FAIR) {
            latencyScore = 50;
        } else if (responseTime > LATENCY_THRESHOLD_GOOD) {
            latencyScore = 75;
        } else if (responseTime > LATENCY_THRESHOLD_EXCELLENT) {
            latencyScore = 90;
        }

        // Update latency score with more weight on recent performance
        metrics.latencyScore = metrics.latencyScore
            ? metrics.latencyScore * 0.6 + latencyScore * 0.4 // More weight on recent performance
            : latencyScore;
    }

    // Calculate reliability score based on total requests with minimum threshold
    const reliabilityScore = metrics.totalRequests >= MIN_REQUESTS_FOR_RELIABILITY ? (metrics.successfulRequests / metrics.totalRequests) * 100 : Math.min(50 + metrics.totalRequests * 5, 100); // Gradually increase base reliability

    // Adaptive weights based on request volume and performance
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
    const successRateScore = metrics.successRate;
    const responseTimeScore = metrics.latencyScore || 50;

    // Weighted health score calculation with reliability
    const targetScore = successRateScore * adaptiveSuccessWeight + responseTimeScore * adaptiveResponseWeight + reliabilityScore * adaptiveReliabilityWeight;

    // Smooth transition to target score with adaptive rate
    const adaptationRate = metrics.totalRequests < MIN_REQUESTS_FOR_RELIABILITY ? 0.2 : 0.1;
    metrics.healthScore += (targetScore - metrics.healthScore) * adaptationRate;

    // Ensure health score stays within bounds
    metrics.healthScore = Math.min(MAX_HEALTH_SCORE, Math.max(MIN_HEALTH_SCORE, metrics.healthScore));

    // Save updated proxies to file
    saveProxiesToFile(providerType);
};

// Add rotation tracking
const proxyUsageMap = new Map<string, number>();

export const selectProxy = (providerType: ProviderType, providerId: string): IProxy | null => {
    const validProxies = proxyCache.validProxies[providerType][providerId] || [];

    if (validProxies.length === 0) return null;

    // Filter proxies by health and usage
    const viableProxies = validProxies.filter((proxy) => {
        const metrics = proxy.providerMetrics?.[providerId];
        if (!metrics) return false;

        // Check health score
        if (metrics.healthScore < MIN_VIABLE_HEALTH) return false;

        // Check consecutive failures
        if (metrics.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return false;

        // Check cooldown if proxy has been used recently
        const proxyKey = `${proxy.ip}:${proxy.port}`;
        const lastUsed = proxyUsageMap.get(proxyKey) || 0;
        const timeSinceLastUse = Date.now() - lastUsed;

        return timeSinceLastUse >= MIN_COOLDOWN_MS;
    });

    if (viableProxies.length === 0) return null;

    // First try to find any unused proxies
    const unusedProxies = viableProxies.filter((proxy) => {
        const proxyKey = `${proxy.ip}:${proxy.port}`;
        return !proxyUsageMap.has(proxyKey);
    });

    // If we have unused proxies, randomly select one to distribute load
    if (unusedProxies.length > 0) {
        const selectedProxy = unusedProxies[Math.floor(Math.random() * unusedProxies.length)];
        const proxyKey = `${selectedProxy.ip}:${selectedProxy.port}`;
        proxyUsageMap.set(proxyKey, Date.now());
        return selectedProxy;
    }

    // If no unused proxies, sort by health score and usage time
    const sortedProxies = viableProxies.sort((a, b) => {
        const aMetrics = a.providerMetrics[providerId];
        const bMetrics = b.providerMetrics[providerId];

        // Calculate score including usage time
        const aKey = `${a.ip}:${a.port}`;
        const bKey = `${b.ip}:${b.port}`;
        const aLastUsed = proxyUsageMap.get(aKey) || 0;
        const bLastUsed = proxyUsageMap.get(bKey) || 0;

        const aTimeFactor = Math.min(1, (Date.now() - aLastUsed) / MAX_COOLDOWN_MS);
        const bTimeFactor = Math.min(1, (Date.now() - bLastUsed) / MAX_COOLDOWN_MS);

        // Heavily weight health score for subsequent requests
        const aScore = aMetrics.healthScore * (0.8 + 0.2 * aTimeFactor);
        const bScore = bMetrics.healthScore * (0.8 + 0.2 * bTimeFactor);

        return bScore - aScore;
    });

    // Select proxy and update usage time
    const selectedProxy = sortedProxies[0];
    const proxyKey = `${selectedProxy.ip}:${selectedProxy.port}`;
    proxyUsageMap.set(proxyKey, Date.now());

    return selectedProxy;
};
