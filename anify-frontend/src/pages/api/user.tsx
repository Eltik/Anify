import { type ServerResponse } from "http";
import { env } from "~/env.mjs";
import { type UserData } from "~/types";

export default async function handler(request: Request, response: ServerResponse) {
    if (!request.body.id) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.write(JSON.stringify({ message: "Missing ID." }));
        response.end();
        return;
    }

    const data = await (await fetch(`${env.AUTH_URL}/user`, {
        method: "POST",
        body: JSON.stringify({
            id: request.body.id
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })).json() as UserData;

    response.writeHead(200, { "Content-Type": "application/json" });
    response.write(JSON.stringify(data));    
    response.end();
    return;
}

interface Request {
    body: {
        id: string;
    }
}