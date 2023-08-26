export interface Info {
  code: number;
  status: string;
  result: Result;
}
  
export interface Result {
  ip: string;
  services: Service[];
  location: Location;
  location_updated_at: string;
  autonomous_system: AutonomousSystem;
  autonomous_system_updated_at: string;
  dns: Dns;
  last_updated_at: string;
  labels: string[];
}
  
export interface Service {
  _decoded: string;
  _encoding: Encoding;
  banner: string;
  banner_hashes: string[];
  banner_hex: string;
  extended_service_name: string;
  labels?: string[];
  observed_at: string;
  perspective_id: string;
  port: number;
  service_name: string;
  software?: Software[];
  source_ip: string;
  ssh?: Ssh;
  transport_fingerprint?: TransportFingerprint;
  transport_protocol: string;
  truncated: boolean;
  certificate?: string;
  http?: Http;
  jarm?: Jarm;
  tls?: Tls;
}

export interface Encoding {
  banner: string;
  banner_hex: string;
  certificate?: string;
}

export interface Software {
  uniform_resource_identifier: string;
  part: string;
  vendor: string;
  product: string;
  source: string;
  version?: string;
  other?: Other;
}

export interface Other {
  family: string;
}

export interface Ssh {
  endpoint_id: EndpointId;
  kex_init_message: KexInitMessage;
  algorithm_selection: AlgorithmSelection;
  server_host_key: ServerHostKey;
  hassh_fingerprint: string;
}

export interface EndpointId {
  _encoding: Encoding2;
  raw: string;
  protocol_version: string;
  software_version: string;
}

export interface Encoding2 {
  raw: string;
}

export interface KexInitMessage {
  kex_algorithms: string[];
  host_key_algorithms: string[];
  client_to_server_ciphers: string[];
  server_to_client_ciphers: string[];
  client_to_server_macs: string[];
  server_to_client_macs: string[];
  client_to_server_compression: string[];
  server_to_client_compression: string[];
  first_kex_follows: boolean;
}

export interface AlgorithmSelection {
  kex_algorithm: string;
  host_key_algorithm: string;
  client_to_server_alg_group: ClientToServerAlgGroup;
  server_to_client_alg_group: ServerToClientAlgGroup;
}

export interface ClientToServerAlgGroup {
  cipher: string;
  mac: string;
  compression: string;
}

export interface ServerToClientAlgGroup {
  cipher: string;
  mac: string;
  compression: string;
}

export interface ServerHostKey {
  fingerprint_sha256: string;
  ecdsa_public_key: EcdsaPublicKey;
}

export interface EcdsaPublicKey {
  _encoding: Encoding3;
  b: string;
  curve: string;
  gx: string;
  gy: string;
  length: number;
  n: string;
  p: string;
  x: string;
  y: string;
}

export interface Encoding3 {
  b: string;
  gx: string;
  gy: string;
  n: string;
  p: string;
  x: string;
  y: string;
}

export interface TransportFingerprint {
  raw: string;
}

export interface Http {
  request: Request;
  response: Response;
  supports_http2: boolean;
}

export interface Request {
  method: string;
  uri: string;
  headers: Headers;
}

export interface Headers {
  Accept: string[];
  _encoding: Encoding4;
  User_Agent: string[];
}

export interface Encoding4 {
  Accept: string;
  User_Agent: string;
}

export interface Response {
  protocol: string;
  status_code: number;
  status_reason: string;
  headers: Headers2;
  _encoding: Encoding6;
  html_tags?: string[];
  body_size: number;
  body: string;
  favicons?: Favicon[];
  body_hashes: string[];
  body_hash: string;
  html_title?: string;
}

export interface Headers2 {
  X_Powered_By?: string[];
  _encoding: Encoding5;
  Date: string[];
  Cache_Control?: string[];
  Connection: string[];
  Content_Type?: string[];
  Etag?: string[];
  Keep_Alive: string[];
  Vary?: string[];
  Content_Length?: string[];
}

export interface Encoding5 {
  X_Powered_By?: string;
  Date: string;
  Cache_Control?: string;
  Connection: string;
  Content_Type?: string;
  Etag?: string;
  Keep_Alive: string;
  Vary?: string;
  Content_Length?: string;
}

export interface Encoding6 {
  html_tags?: string;
  body: string;
  body_hash: string;
  html_title?: string;
}

export interface Favicon {
  size: number;
  name: string;
  md5_hash: string;
}

export interface Jarm {
  _encoding: Encoding7;
  fingerprint: string;
  cipher_and_version_fingerprint: string;
  tls_extensions_sha256: string;
  observed_at: string;
}

export interface Encoding7 {
  fingerprint: string;
  cipher_and_version_fingerprint: string;
  tls_extensions_sha256: string;
}

export interface Tls {
  version_selected: string;
  cipher_selected: string;
  certificates: Certificates;
  _encoding: Encoding10;
  ja3s: string;
}

export interface Certificates {
  _encoding: Encoding8;
  leaf_fp_sha_256: string;
  leaf_data: LeafData;
}

export interface Encoding8 {
  leaf_fp_sha_256: string;
}

export interface LeafData {
  names: string[];
  subject_dn: string;
  issuer_dn: string;
  pubkey_bit_size: number;
  pubkey_algorithm: string;
  tbs_fingerprint: string;
  fingerprint: string;
  issuer: Issuer;
  subject: Subject;
  public_key: PublicKey;
  signature: Signature;
}

export interface Issuer {
  common_name: string[];
  organization: string[];
  country: string[];
}

export interface Subject {
  common_name: string[];
}

export interface PublicKey {
  key_algorithm: string;
  rsa: Rsa;
  fingerprint: string;
}

export interface Rsa {
  _encoding: Encoding9;
  modulus: string;
  exponent: string;
  length: number;
}

export interface Encoding9 {
  modulus: string;
  exponent: string;
}

export interface Signature {
  signature_algorithm: string;
  self_signed: boolean;
}

export interface Encoding10 {
  ja3s: string;
}

export interface Location {
  continent: string;
  country: string;
  country_code: string;
  city: string;
  timezone: string;
  province: string;
  coordinates: Coordinates;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AutonomousSystem {
  asn: number;
  description: string;
  bgp_prefix: string;
  name: string;
  country_code: string;
}

export interface Dns {
  names: string[];
  records: Records;
}

export interface Records {
  "junlongchat.cloud": JunlongchatCloud;
}

export interface JunlongchatCloud {
  record_type: string;
  resolved_at: string;
}
