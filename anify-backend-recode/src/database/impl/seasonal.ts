import { db } from "..";
import { Type } from "../../types/enums";
import { Anime, Manga } from "../../types/types";

export const seasonal = async (trending: Anime[] | Manga[], popular: Anime[] | Manga[], top: Anime[] | Manga[], seasonal: Anime[] | Manga[]) => {
    const ids = {
        trending: trending.map((a) => String(a.id)),
        popular: popular.map((a) => String(a.id)),
        top: top.map((a) => String(a.id)),
        seasonal: seasonal.map((a) => String(a.id)),
    };

    const trend = await db.query(`
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.trending.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `).all() as Anime[] | Manga[];

    const pop = await db.query(`
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.popular.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `).all() as Anime[] | Manga[];

    const t = await db.query(`
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.top.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `).all() as Anime[] | Manga[];

    const season = await db.query(`
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.seasonal.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `).all() as Anime[] | Manga[];

    trend.map((media) => {
        media.characters = [];
    });
    pop.map((media) => {
        media.characters = [];
    });
    t.map((media) => {
        media.characters = [];
    });
    season.map((media) => {
        media.characters = [];
    });

    return { trending: trend, popular: pop, top: t, seasonal: season };
};