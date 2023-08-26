import { type ServerResponse } from "http";
import { env } from "~/env.mjs";
import { type MixdropResponse } from "~/types";

export default async function handler(request: Request, response: ServerResponse) {
    if (!request.body.id) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.write(JSON.stringify({ message: "Missing mixdrop ID." }));
        response.end();
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data: MixdropResponse = await (await fetch(`${env.BACKEND_URL}/pages-download?apikey=${env.API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: request.body.id
        })
    })).json();

    response.writeHead(200, { "Content-Type": "application/json" });
    response.write(JSON.stringify(data));
    response.end();
}

interface Request {
    body: {
        id: string;
    }
}