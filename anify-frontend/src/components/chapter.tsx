/* eslint-disable @next/next/no-img-element */
import moment from "moment";
import Link from "next/link";
import { capitalize, truncate } from "~/helper";
import { type Anime, type Manga, type Episode, type Chapter, MixdropResponse } from "~/types";

const Chapter = ({ chapter, media, provider, index, subDub }: { chapter: Episode | Chapter; media: Anime | Manga, provider: string, index: number, subDub: string }) => {
    const sendRequest = async (mixdrop: string) => {
        const data = await (await fetch(`/api/mixdrop`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: mixdrop
            })
        })).json() as MixdropResponse;

        const url = data.result[Object.keys(data.result)[0] ?? 0]?.url;
        return url;
    };

    if (media.type === "ANIME") {
        return (
            <Link href={media.type === "ANIME" ? `/watch/${media.id}/${provider}/${encodeURIComponent(chapter.id)}/${subDub}` : `/read/${media.id}/${provider}/${encodeURIComponent(chapter.id)}`}>
                <div className={`${(chapter as Episode).isFiller ? "bg-orange-200/30" : "bg-background-light"} snap-start shrink-0 w-full rounded-lg flex flex-col items-center p-2 transition-all duration-300 ease-out lg:hover:scale-105 cursor-pointer`}>
                    <div className="shrink-0 w-full">
                        <img src={(chapter as Episode).img ?? media.coverImage ?? ""} alt={`${media.title.english ?? media.title.romaji ?? media.title.native ?? ""} chapter ${chapter.number} cover`} className="w-full h-48 md:h-32 rounded-md object-cover" loading="lazy" />
                    </div>
                    <div className="p-1 w-full h-full flex flex-col justify-center">
                        <p className="line-clamp-1 text-md font-semibold">{truncate(chapter.title ?? "Episode " + (String(chapter.number ?? index)), 100)}</p>
                        <p className="text-sm font-light tracking-wider">
                            Episode {chapter.number ?? index} &middot; <span className="text-gray-300">{chapter.updatedAt ? moment(new Date(chapter.updatedAt)).fromNow() : capitalize(provider)}</span>
                        </p>
                    </div>
                </div>
            </Link>
        )
    } else {
        return (
            <div>
                
                <Link href={`/read/${media.id}/${provider}/${encodeURIComponent(chapter.id)}`} className="flex items-center justify-between py-2 px-4 bg-zinc-800 shadow-sm hover:shadow-md hover:bg-zinc-700 hover:scale-105 cursor-pointer rounded-md transition-all duration-150 ease-in-out active:scale-95">
                    <div className="">
                        <div className="text-white text-sm font-medium">{truncate(chapter.title ?? "Chapter " + (String(chapter.number ?? index)), 100)}</div>
                        <div className="text-gray-400 text-xs">{capitalize(provider)}</div>
                    </div>
                    {(chapter as Chapter).mixdrop ? (
                        <div>
                            {/*<div className="text-gray-500 text-sm font-medium">{chapter.number ?? index}</div>*/}
                            <button type="button" className="text-sm font-medium text-gray-500 transition-all duration-200 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                    <path d="M12 17V3"/>
                                    <path d="m6 11 6 6 6-6"/>
                                    <path d="M19 21H5"/>
                                </svg>
                            </button>
                        </div>
                    ) : null}
                </Link>
            </div>
        )
    }
};

export default Chapter;