/**
 * @fileoverview Proxies types
 */

import { ProviderType } from "../..";

/**
 * @description Provider-specific health metrics
 */
export interface IProxyProviderMetrics {
    healthScore: number;
    lastSuccessTime?: Date;
    lastFailureTime?: Date;
    consecutiveFailures: number;
    successRate: number;
    averageResponseTime: number;
    successfulRequests: number;
    totalRequests: number;
}

/**
 * @description Proxy interface
 */
export interface IProxy {
    ip: string;
    port: number;
    country: string;
    type: string;
    anonymity: string;
    // Store metrics per provider
    providerMetrics: Record<ProviderType, Record<string, IProxyProviderMetrics>>;
}

/**
 * @description Custom request config
 */
export interface IRequestConfig extends RequestInit {
    isChecking?: boolean;
    proxy?: string;
    useGoogleTranslate?: boolean;
    timeout?: number;
    providerType?: ProviderType;
    providerId?: string;
    maxRetries?: number;
}

export interface IProxyCheckInfo {
    lastChecked: string;
    validProxiesFound: number;
    lastCheckedIndex?: number; // Track where we left off in the proxy list
}

export interface IProxyChecksConfig {
    proxyChecks: {
        [key in ProviderType]?: {
            [providerId: string]: IProxyCheckInfo;
        };
    };
}
