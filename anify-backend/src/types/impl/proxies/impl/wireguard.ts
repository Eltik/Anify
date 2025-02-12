export interface IWireguardConfig {
    privateKey: string;
    address: string;
    dns: string;
    publicKey: string;
    allowedIPs: string;
    endpoint: string;
    name: string;
    active: boolean;
}
