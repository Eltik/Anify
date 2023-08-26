/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { parseFormat } from "~/helper";

import { Type, type Anime, type Manga } from "~/types";

const MediaItem = ({ media, recent }: { media: Anime | Manga, recent?: boolean }) => {
    const [showModel, setShowModel] = useState(false);

    const status = [
        {
            value: "CURRENT",
            label: media.type === "ANIME" ? "Currently Watching" : "Currently Reading"
        },
        {
            value: "PLANNING",
            label: media.type === "ANIME" ? "Plan to Watch" : "Plan to Read"
        },
        {
            value: "COMPLETED",
            label: "Completed"
        },
        {
            value: "PAUSED",
            label: "Paused"
        },
        {
            value: "DROPPED",
            label: "Dropped"
        },
        {
            value: "REPEATING",
            label: "Repeating"
        }
    ];

    return (
        <>
            <div className="flex group flex-col gap-2 w-[calc(34vh/1.5)] h-full min-w-[120px] text-white">
                <div className="rounded-md border border-slate-600/40 bg-main-primary/5 h-[40vh] md:h-[40vh] min-h-[220px]">
                    <section className="p-4 relative group">
                        <Link href={`/info/${media.id}`}>
                            <img src={media.coverImage ?? ""} alt={(media.title.english ?? media.title.romaji ?? media.title.native ?? "") + " Cover"} className="w-full object-cover lg:h-[28vh] 2xl:h-[32vh] shadow-md group-hover:scale-[1.09] transition-transform duration-300 opacity-100 group-hover:opacity-70 relative shadow-background rounded-md" />
                        </Link>
                        <span className="font-semibold border-t border-primary-400/10 shadow-md shadow-[rgb(49,58,80)] gap-1 flex items-center px-2 py-1 leading-4 text-xs rounded-md bg-background-token/70 absolute top-1.5 left-2.5 z-10 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-0 translate-x-[-50%] transition-all duration-300" style={{
                            backdropFilter: "blur(2px)",
                            WebkitBackdropFilter: "blur(2px)"
                        }}>
                            <span className="">{media.averageRating}</span>
                            <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="fill-yellow-400 w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </span>
                        <div className="absolute border-t border-main-dark/10 shadow-md shadow-main-dark bottom-[-5%] opacity-0 group-hover:opacity-100 group-hover:bottom-1 flex flex-col p-[1rem] transition-all duration-300 bg-main/70 lg:left-2.5 xl:left-4 lg:rounded-b-md rounded-md px-2 py-1 w-[89%] z-50" style={{
                            backdropFilter: "blur(2px)",
                            WebkitBackdropFilter: "blur(2px)"
                        }}>
                            <section className="flex items-center justify-between z-50">
                                <button type="button" className="rounded-md hover:bg-main-primary/30 transition-all duration-200">
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                    </svg>
                                </button>
                                <Link href={`/info/${media.id}`} className="rounded-md hover:bg-main-primary/30 transition-all duration-200">
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M12 16v-4"/>
                                        <path d="M12 8h.01"/>
                                    </svg>
                                </Link>
                                <button type="button" className="rounded-md hover:bg-main-primary/30 transition-all duration-200">
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3"/>
                                    </svg>
                                </button>
                                <button type="button" className="rounded-md hover:bg-main-primary/30 transition-all duration-200" onClick={() => {
                                    setShowModel(!showModel)
                                }}>
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"/>
                                    </svg>
                                </button>
                            </section>
                        </div>
                    </section>
                    <footer className="flex flex-col p-[1rem] pt-[0px]">
                        <ul className="">
                            <li className="text-lg font-semibold text-slate-300 line-clamp-1 w-full">{media.title.english ?? media.title.romaji ?? media.title.native}</li>
                            <li className="flex items-center gap-1">
                                {recent ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-main-primary font-medium">{media.type === Type.ANIME ? "Episode " : "Chapter "}</span>
                                        <span className="">{media.type === Type.ANIME ? (media as Anime).episodes.latest.latestEpisode : (media as Manga).chapters.latest.latestChapter}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <span className="text-main-primary font-medium">{parseFormat(media.format)}</span>
                                        <svg className="bi fill-main bi-diamond-fill inline-block w-2 h-2" xmlns="http://www.w3.org/2000/svg" fill="" viewBox="0 0 16 16" aria-hidden="true">
                                            <path fillRule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 0 1 0-2.098L6.95.435z" className=""/>
                                        </svg>
                                        <span className="">{media.year}</span>
                                    </div>
                                )}
                            </li>
                        </ul>
                    </footer>
                </div>
            </div>
        </>
    )
};

export default MediaItem;