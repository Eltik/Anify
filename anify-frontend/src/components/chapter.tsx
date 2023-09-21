/* eslint-disable @next/next/no-img-element */
import moment from "moment";
import Link from "next/link";
import { capitalize, truncate } from "~/helper";
import { type Anime, type Manga, type Episode, type Chapter } from "~/types";

const Chapter = ({ chapter, media, provider, index, subDub }: { chapter: Episode | Chapter; media: Anime | Manga; provider: string; index: number; subDub: string }) => {
    if (media.type === "ANIME") {
        return (
            <Link href={media.type === "ANIME" ? `/watch/${media.id}/${provider}/${encodeURIComponent(chapter.id)}/${subDub}` : `/read/${media.id}/${provider}/${encodeURIComponent(chapter.id)}`}>
                <div className={`${(chapter as Episode).isFiller ? "bg-orange-200/30" : "bg-background-light"} flex w-full shrink-0 cursor-pointer snap-start flex-col items-center rounded-lg p-2 transition-all duration-300 ease-out lg:hover:scale-105`}>
                    <div className="w-full shrink-0">
                        <img src={(chapter as Episode).img ?? media.coverImage ?? ""} alt={`${media.title.english ?? media.title.romaji ?? media.title.native ?? ""} chapter ${chapter.number} cover`} className="h-48 w-full rounded-md object-cover md:h-32" loading="lazy" />
                    </div>
                    <div className="flex h-full w-full flex-col justify-center p-1">
                        <p className="text-md line-clamp-1 font-semibold">{truncate(chapter.title ?? "Episode " + String(chapter.number ?? index), 100)}</p>
                        <p className="text-sm font-light tracking-wider">
                            Episode {chapter.number ?? index} &middot; <span className="text-gray-300">{chapter.updatedAt ? moment(new Date(chapter.updatedAt)).fromNow() : capitalize(provider)}</span>
                        </p>
                    </div>
                </div>
            </Link>
        );
    } else {
        return (
            <div>
                <Link href={`/read/${media.id}/${provider}/${encodeURIComponent(chapter.id)}`} className="flex cursor-pointer items-center justify-between rounded-md bg-zinc-800 px-4 py-2 shadow-sm transition-all duration-150 ease-in-out hover:scale-105 hover:bg-zinc-700 hover:shadow-md active:scale-95">
                    <div className="">
                        <div className="text-sm font-medium text-white">{truncate(chapter.title ?? "Chapter " + String(chapter.number ?? index), 100)}</div>
                        <div className="text-xs text-gray-400">{capitalize(provider)}</div>
                    </div>
                    {(chapter as Chapter).mixdrop ? (
                        <div>
                            {/*<div className="text-gray-500 text-sm font-medium">{chapter.number ?? index}</div>*/}
                            <button type="button" className="text-sm font-medium text-gray-500 transition-all duration-200 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                    <path d="M12 17V3" />
                                    <path d="m6 11 6 6 6-6" />
                                    <path d="M19 21H5" />
                                </svg>
                            </button>
                        </div>
                    ) : null}
                </Link>
            </div>
        );
    }
};

export default Chapter;
