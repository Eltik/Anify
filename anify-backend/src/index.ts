import { init as initDB } from "./database";
import { init as initWireguard } from "./proxies/impl/wireguard";
import { init as initWorkers } from "./worker";
import { env } from "./env";
import app from "./app";
import { preloadProxies } from "./proxies/impl/manager/impl/file/preloadProxies";

(async () => {
    if (env.DEBUG) {
        console.log(env);
    }
    await initDB();
    await initWireguard();
    initWorkers();

    await preloadProxies();

    await app.start();
})();
