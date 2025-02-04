export interface ICensysRoot {
    code: number;
    status: string;
    result: ICensysResult;
}

export interface ICensysResult {
    query: string;
    total: number;
    duration: number;
    hits: ICensysHit[];
    links: ICensysLinks;
}

export interface ICensysHit {
    ip: string;
    services: ICensysService[];
    location: ICensysLocation;
    autonomous_system: ICensysAutonomousSystem;
    last_updated_at: string;
    dns?: ICensysDNS;
}

export interface ICensysService {
    port: number;
    service_name: string;
    extended_service_name: string;
    transport_protocol: string;
    certificate?: string;
}

export interface ICensysLocation {
    continent: string;
    country: string;
    country_code: string;
    city: string;
    postal_code?: string;
    timezone: string;
    coordinates: ICensysCoordinates;
    province?: string;
}

export interface ICensysCoordinates {
    latitude: number;
    longitude: number;
}

export interface ICensysAutonomousSystem {
    asn: number;
    description: string;
    bgp_prefix: string;
    name: string;
    country_code: string;
}

export interface ICensysDNS {
    reverse_dns: ICensysReverseDNS;
}

export interface ICensysReverseDNS {
    names: string[];
}

export interface ICensysLinks {
    next: string;
    prev: string;
}
