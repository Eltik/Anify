/**
 * @fileoverview Proxies types
 */

import { ProviderType } from "../..";

/**
 * @description Provider-specific health metrics
 */
export interface IProxyProviderMetrics {
    healthScore: number;
    lastSuccessTime?: number;
    lastFailureTime?: number;
    consecutiveFailures: number;
    successRate: number;
    averageResponseTime: number;
    successfulRequests: number;
    totalRequests: number;
    successStreak: number;
    latencyScore: number;
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
    providerMetrics: Record<string, IProxyProviderMetrics>; // providerId -> metrics
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
    validateResponse?: (response: Response) => Promise<boolean>;
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
