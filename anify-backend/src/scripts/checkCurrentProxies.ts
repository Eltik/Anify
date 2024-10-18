import { checkCurrentProxies } from "../proxies/impl/checkProxies";

const startIndex = Number(process.argv.slice(2)?.toString()?.toLowerCase() ?? "0");

console.log("Starting index: " + startIndex);
checkCurrentProxies(startIndex).then((data) => {
    // Hang infinitely
    console.log(data);
    console.log("Successfully checked CORS proxies!");

    setInterval(() => {}, 1000);
});
