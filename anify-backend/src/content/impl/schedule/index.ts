import Database from "../../../database";
import { Anime } from "../../../mapping";
import AniList from "../../../mapping/impl/information/anilist";

export const fetchSchedule = async (): Promise<Schedule | undefined> => {
    const results: Anime[] = [];

    const aniList = new AniList();
    const schedule = await aniList.fetchSchedule();
    if (!schedule) return undefined;

    for (const show of schedule) {
        const possible = await Database.info(String(show.media.id));
        if (possible) {
            (possible as any).airingEpisode = show.episode;
            (possible as any).airingAt = show.airingAt * 1000;

            results.push(possible as Anime);
        }
    }

    const formattedResponse: Schedule | undefined = results.reduce(
        (acc: any, anime) => {
            const day = new Date((anime as any).airingAt).getDay();

            switch (day) {
                case 0:
                    acc.sundaySchedule.push(anime);
                    break;
                case 1:
                    acc.mondaySchedule.push(anime);
                    break;
                case 2:
                    acc.tuesdaySchedule.push(anime);
                    break;
                case 3:
                    acc.wednesdaySchedule.push(anime);
                    break;
                case 4:
                    acc.thursdaySchedule.push(anime);
                    break;
                case 5:
                    acc.fridaySchedule.push(anime);
                    break;
                case 6:
                    acc.saturdaySchedule.push(anime);
                    break;
            }

            return acc;
        },
        {
            sundaySchedule: [],
            mondaySchedule: [],
            tuesdaySchedule: [],
            wednesdaySchedule: [],
            thursdaySchedule: [],
            fridaySchedule: [],
            saturdaySchedule: [],
        }
    );

    return formattedResponse;
};

interface Schedule {
    sundaySchedule: Anime[];
    mondaySchedule: Anime[];
    tuesdaySchedule: Anime[];
    wednesdaySchedule: Anime[];
    thursdaySchedule: Anime[];
    fridaySchedule: Anime[];
    saturdaySchedule: Anime[];
}
