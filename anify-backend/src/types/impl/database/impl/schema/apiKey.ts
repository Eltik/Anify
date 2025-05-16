export interface IApiKey {
    id: string;
    key: string;
    autoCharge: {
        enabled: boolean;
        autoChargeThreshold: number;
        autoChargeAmount: number;
    };
    ignoreAutoLimits: boolean;
    limits: {
        premiumLimit: number;
    };
    stats: {
        generatedAt: Date;
        lastReset: Date;
        premiumUsed: number;
        additionalPurchasedUsed: number;
    };
    subId: string;
    webhooks: string[];
    createdAt: Date;
    updatedAt: Date;
}
