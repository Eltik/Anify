import type { IColumnDefinition } from "../../../../types/impl/database";

const apiKeySchema = [
    { name: "id", type: "TEXT", primaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "key", type: "TEXT", unique: true },
    { name: "autoCharge", type: "JSONB", defaultValue: `'{"enabled": false, "autoChargeThreshold": 250, "autoChargeAmount": 500}'::JSONB` },
    { name: "ignoreAutoLimits", type: "BOOLEAN", defaultValue: "false" },
    { name: "limits", type: "JSONB", defaultValue: `'{"premiumLimit": 0}'::JSONB` },
    { name: "stats", type: "JSONB", defaultValue: `'{"generatedAt": "2025-02-20T01:57:29.355Z", "lastReset": "2025-05-15T00:35:05.426Z", "premiumUsed": 0, "additionalPurchasedUsed": 1}'::JSONB` },
    { name: "subId", type: "TEXT" },
    { name: "webhooks", type: "TEXT[]", defaultValue: "'{}'::TEXT[]" },
    { name: "createdAt", type: "TIMESTAMP", defaultValue: "NOW()" },
    { name: "updatedAt", type: "TIMESTAMP", defaultValue: "NOW()" },
] as IColumnDefinition[];

export default apiKeySchema;
