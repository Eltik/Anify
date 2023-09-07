import queues from "../../worker";
import { search } from "../../database/impl/search";
import { Format, Type } from "../../types/enums";
import { db } from "../../database";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const anime = await db.query("SELECT * FROM anime;").all();
        const manga = await db.query("SELECT * FROM manga;").all();

        return new Response(
            JSON.stringify({
                anime: anime,
                manga: manga,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

const route = {
    method: "GET",
    path: "/all",
    handler,
};

export default route;
