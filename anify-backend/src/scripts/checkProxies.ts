import { checkCorsProxies } from "../proxies/impl/checkProxies";

const importCurrent = (process.argv.slice(2)?.toString()?.split(",")[0]?.toLowerCase() ?? "false") === "true";
const startIndex = Number(process.argv.slice(3)?.toString()?.toLowerCase() ?? "0");

console.log(importCurrent ? "Importing current proxies" : "Not importing current proxies");
console.log("Starting index: " + startIndex);
checkCorsProxies(importCurrent, startIndex).then((data) => {
    // Hang infinitely
    console.log(data);
    console.log("Successfully checked CORS proxies!");

    setInterval(() => {}, 1000);
});
