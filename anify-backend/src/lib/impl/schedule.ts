import { get } from "../../database/impl/fetch/get";
import { Format, Type } from "../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo } from "../../types/types";
import { BASE_PROVIDERS } from "../../mappings";
import queues from "../../worker";

export const loadSchedule = async (data: { type: Type; fields?: string[] }) => {
    const formats = data.type === Type.ANIME ? [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT] : [Format.MANGA, Format.ONE_SHOT];

    const baseData = await (
        await BASE_PROVIDERS.map((provider) => {
            if (provider.formats?.includes(formats[0])) {
                return provider.fetchSchedule();
            } else {
                return null;
            }
        }).filter((x) => x !== null)
    )[0];

    const sunday: Anime[] | Manga[] = [];
    const monday: Anime[] | Manga[] = [];
    const tuesday: Anime[] | Manga[] = [];
    const wednesday: Anime[] | Manga[] = [];
    const thursday: Anime[] | Manga[] = [];
    const friday: Anime[] | Manga[] = [];
    const saturday: Anime[] | Manga[] = [];

    const promises = [];

    const checkMedia = async (media: AnimeInfo | MangaInfo): Promise<Anime | Manga | undefined> => {
        const existing = await get(media.id, data.fields ?? []);
        if (!existing) {
            queues.mappingQueue.add({ id: media.id, type: media.type, formats: [media.format] });
            return undefined;
        }

        Object.assign(existing, {
            airingAt: (media as any).airingAt,
            airingEpisode: (media as any).airingEpisode,
        });

        return existing;
    };

    for (const item of baseData?.sunday ?? []) {
        promises.push(
            checkMedia(item).then((x) => {
                if (x) {
                    sunday.push(x as any);
                }
            }),
        );
    }

    for (const item of baseData?.monday ?? []) {
        promises.push(
            checkMedia(item).then((x) => {
                if (x) {
                    monday.push(x as any);
                }
            }),
        );
    }

    for (const item of baseData?.tuesday ?? []) {
        promises.push(
            checkMedia(item).then((x) => {
                if (x) {
                    tuesday.push(x as any);
                }
            }),
        );
    }

    for (const item of baseData?.wednesday ?? []) {
        promises.push(
            checkMedia(item).then((x) => {
                if (x) {
                    wednesday.push(x as any);
                }
            }),
        );
    }

    for (const item of baseData?.thursday ?? []) {
        promises.push(
            checkMedia(item).then((x) => {
                if (x) {
                    thursday.push(x as any);
                }
            }),
        );
    }

    for (const item of baseData?.friday ?? []) {
        promises.push(
            checkMedia(item).then((x) => {
                if (x) {
                    friday.push(x as any);
                }
            }),
        );
    }

    for (const item of baseData?.saturday ?? []) {
        promises.push(
            checkMedia(item).then((x) => {
                if (x) {
                    saturday.push(x as any);
                }
            }),
        );
    }

    await Promise.all(promises);

    return {
        sunday,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
    };
};
