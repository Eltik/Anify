import { checkCorsProxies } from "../proxies/impl/checkProxies";

const importCurrent = (process.argv.slice(2)?.toString()?.toLowerCase() ?? "false") === "true";
checkCorsProxies(importCurrent).then((data) => {
    // Hang infinitely
    console.log(data);
    console.log("Successfully checked CORS proxies!");

    setInterval(() => {}, 1000);
});
