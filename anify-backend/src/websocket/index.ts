import colors from "colors";

import emitter, { Events } from "../lib";
import { env } from "../env";

export const startWebsocket = async () => {
    const server = Bun.serve({
        port: env.PORT ? Number(env.PORT) + 1 : 3000,
        websocket: {
            open(ws) {
                ws.subscribe("entry");
                ws.publish("entry", (ws.data as any).clientName);
            },
            message(ws, message) {
                ws.publish("entry", `${(ws.data as any).clientName}: ${message}`);
            },
            close(ws) {
                const msg = `${(ws.data as any).clientName} has left`;

                ws.unsubscribe("entry");
                ws.publish("entry", msg);
            },
        },
        async fetch(req: Request, server) {
            const url = new URL(req.url);
            if (url.pathname === "/entry") {
                const protocol = req.headers.get("client-name") ?? "unknown";
                if (protocol !== "anify-backend") return new Response("Unauthorized", { status: 401 });

                const success = server.upgrade(req, {
                    data: { clientName: protocol, message: req.body ?? "No message provided." },
                });
                return success ? undefined : new Response("WebSocket upgrade error", { status: 400 });
            }

            return new Response("Hello world");
        },
    });

    emitter.on(Events.COMPLETED_ENTRY_CREATION, (entry) => {
        server.publish("entry", JSON.stringify(entry));
    });

    console.log(colors.blue(`Websocket is now listening on ${env.PORT + 1}`));
};
