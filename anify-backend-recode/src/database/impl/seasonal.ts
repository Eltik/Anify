import { db } from "..";
import { Type } from "../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo } from "../../types/types";

export const seasonal = async (trending: AnimeInfo[] | MangaInfo[], popular: AnimeInfo[] | MangaInfo[], top: AnimeInfo[] | MangaInfo[], seasonal: AnimeInfo[] | MangaInfo[]) => {
    const ids = {
        trending: trending.map((a) => String(a.id)),
        popular: popular.map((a) => String(a.id)),
        top: top.map((a) => String(a.id)),
        seasonal: seasonal.map((a) => String(a.id)),
    };

    const trend = (await db
        .query(
            `
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.trending.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `,
        )
        .all()) as Anime[] | Manga[];

    const pop = (await db
        .query(
            `
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.popular.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `,
        )
        .all()) as Anime[] | Manga[];

    const t = (await db
        .query(
            `
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.top.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `,
        )
        .all()) as Anime[] | Manga[];

    const season = (await db
        .query(
            `
        SELECT * FROM ${trending[0].type === Type.ANIME ? "anime" : "manga"}
        WHERE id IN (${ids.seasonal.map((id) => `'${id}'`).join(", ")})
        ORDER BY title->>'english' ASC
    `,
        )
        .all()) as Anime[] | Manga[];

    trend.map((media) => {
        if (media.type === Type.ANIME) {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                episodes: JSON.parse((media as any).episodes),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        } else {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                chapters: JSON.parse((media as any).chapters),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        }

        media.characters = [];
    });
    pop.map((media) => {
        if (media.type === Type.ANIME) {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                episodes: JSON.parse((media as any).episodes),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        } else {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                chapters: JSON.parse((media as any).chapters),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        }

        media.characters = [];
    });
    t.map((media) => {
        if (media.type === Type.ANIME) {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                episodes: JSON.parse((media as any).episodes),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        } else {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                chapters: JSON.parse((media as any).chapters),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        }

        media.characters = [];
    });
    season.map((media) => {
        if (media.type === Type.ANIME) {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                episodes: JSON.parse((media as any).episodes),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        } else {
            Object.assign(media, {
                title: JSON.parse((media as any).title),
                mappings: JSON.parse((media as any).mappings),
                synonyms: JSON.parse((media as any).synonyms),
                rating: JSON.parse((media as any).rating),
                popularity: JSON.parse((media as any).popularity),
                relations: JSON.parse((media as any).relations),
                genres: JSON.parse((media as any).genres),
                tags: JSON.parse((media as any).tags),
                chapters: JSON.parse((media as any).chapters),
                artwork: JSON.parse((media as any).artwork),
                characters: JSON.parse((media as any).characters),
            });
        }

        media.characters = [];
    });

    return { trending: trend, popular: pop, top: t, seasonal: season };
};
