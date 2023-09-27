import { checkCorsProxies } from "../proxies/impl/checkProxies";

checkCorsProxies().then((data) => {
    // Hang infinitely
    console.log(data);
    console.log("Successfully checked CORS proxies!");

    setInterval(() => {}, 1000);
});
