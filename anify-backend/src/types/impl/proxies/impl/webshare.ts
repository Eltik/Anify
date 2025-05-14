export interface IWebshareProxy {
    username?: string;
    password?: string;
    proxy_address: string;
    port: number;
    valid: boolean;
    last_verified?: string;
    country_code?: string;
    city_name?: string;
    asn?: number;
    organization_name?: string;
    https_support?: boolean;
    proxy_type?: string; // e.g., "http", "socks5"
    id?: string;
}

export interface IWebshareListResponse {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results: IWebshareProxy[];
}
