import { program } from "commander";
import colors from "colors";
import { checkAll } from "./impl/checkAll";
import { checkProvider } from "./impl/checkProvider";
import helper from "./impl/helper";
import { ProviderType } from "../types";
import { init, wireguardProxyManager } from "../proxies/impl/wireguard";

// ---------------------------------------------------
// CLI definition using Commander
// ---------------------------------------------------
program.name("anify-cli").description("CLI for running various tasks related to proxies and media providers.").version("1.0.0");

program
    .command("disconnect")
    .description("Disconnects from all WireGuard configurations.")
    .action(async () => {
        try {
            await init();
            await wireguardProxyManager.disconnect();

            console.log(colors.green("Successfully disconnected from all WireGuard connections."));
            process.exit(0);
        } catch (error) {
            console.error(colors.red(`Error while disconnecting from WireGuard connections: ${error}`));
            process.exit(1);
        }
    });

program
    .command("check-all")
    .description("Check proxies for all media providers.")
    .action(async () => {
        try {
            await checkAll(true);

            console.log(colors.green("Successfully checked proxies for ALL providers."));
            process.exit(0);
        } catch (error) {
            console.error(colors.red(`Error while checking proxies for all providers: ${error}`));
            process.exit(1);
        }
    });

program
    .command("check-provider <providerId> <providerType>")
    .description("Check proxies for a specific provider by ID and provider type.")
    .action(async (providerId: string, providerType: ProviderType) => {
        try {
            await checkProvider(providerId, providerType, true);
            console.log(colors.green(`Completed proxy check for provider "${providerId}".`));
            process.exit(0);
        } catch (error) {
            // Log the error but don't exit with error code
            console.error(colors.red(`Error in proxy check script: ${error instanceof Error ? error.message : String(error)}`));
            process.exit(0); // Exit with success code since we handled the error
        }
    });

program
    .command("scrape-proxies")
    .description("Scrape new proxies from external sources and save them.")
    .action(async () => {
        try {
            await helper.scrapeNewProxies();
            process.exit(0);
        } catch (error) {
            console.error(colors.red(`Error while scraping proxies: ${error}`));
            process.exit(1);
        }
    });

// Optional: List all providers
program
    .command("list-providers")
    .description("Lists all available provider IDs.")
    .action(async () => {
        try {
            const providers = await helper.getAllProviders();
            console.log(colors.green("Available Providers:"));
            for (const provider of providers) {
                console.log(` - ${provider.id} [type: ${provider.providerType}]`);
            }
            process.exit(0);
        } catch (error) {
            console.error(colors.red(`Error while listing providers: ${error}`));
            process.exit(1);
        }
    });

// Optional: Check how many proxies each provider might have or other stats
program
    .command("stats")
    .description("Show some stats about existing proxies, providers, etc.")
    .action(async () => {
        try {
            // For example, let's do some dummy logging:
            const providers = await helper.getAllProviders();
            console.log(colors.blue(`Total Providers: ${providers.length}`));
            // We might also read from a file or database that tracks how many proxies we have
            console.log(colors.blue("Proxy stats functionality can be implemented here."));
            process.exit(0);
        } catch (error) {
            console.error(colors.red(`Error while fetching stats: ${error}`));
            process.exit(1);
        }
    });

program.parse(process.argv);
