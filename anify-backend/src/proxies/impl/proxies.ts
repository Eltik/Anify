import { writeFile } from "fs/promises";

const API_URL = "https://jubilant-lamp-pink.vercel.app/proxies";
const OUTPUT_FILE = "proxies.json";

async function fetchProxies(): Promise<void> {
  const apiKey = process.env.PROXIES_API_KEY;

  if (!apiKey) {
    throw new Error("💔 PROXIES_API_KEY is not set in environment variables!");
  }

  const response = await fetch(API_URL, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(
      `🚨 Request failed with status ${response.status}: ${response.statusText}`
    );
  }

  const data: unknown = await response.json();

  await writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");

  console.log(`✨ Proxies saved to ${OUTPUT_FILE}!`);
}

fetchProxies().catch((err: Error) => {
  console.error("💥 Oops!", err.message);
  process.exit(1);
});