import { expect, test } from "bun:test";
import { scrape } from "../../../proxies/impl/manager/impl/scrape";
import { env } from "../../../env";

test(
    "Proxies.Scrape",
    async (done) => {
        const data = await scrape();
        if (env.DEBUG) {
            console.log(data);
        }
        expect(data).not.toBeEmpty();

        done();
    },
    {
        timeout: 30000,
    },
);
