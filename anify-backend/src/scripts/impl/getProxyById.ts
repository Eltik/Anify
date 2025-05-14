import { IProxy } from "../../types/impl/proxies";
import { join } from "path";

export const getProxyById = async (proxyId: string): Promise<IProxy> => {
    const filePath = join(process.cwd(), "proxies.json");
    const file = Bun.file(filePath);
    const proxies = await file.json();
    return proxies.find((proxy: IProxy) => proxy.id === proxyId);
};
