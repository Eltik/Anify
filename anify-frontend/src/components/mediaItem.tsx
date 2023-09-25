/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { parseFormat } from "~/helper";

import { Type, type Anime, type Manga } from "~/types";

const MediaItem = ({ media, recent }: { media: Anime | Manga; recent?: boolean }) => {
    const [showModel, setShowModel] = useState(false);

    return (
        <>
            <div className="group flex h-full w-[calc(34vh/1.5)] min-w-[120px] flex-col gap-2 text-white">
                <div className="h-[40vh] min-h-[220px] rounded-md border border-slate-600/40 bg-main-primary/5 md:h-[40vh]">
                    <section className="group relative p-4">
                        <Link href={`/info/${media.id}`}>
                            <img src={media.coverImage ?? ""} alt={(media.title.english ?? media.title.romaji ?? media.title.native ?? "") + " Cover"} className="relative w-full rounded-md object-cover opacity-100 shadow-md shadow-background transition-transform duration-300 group-hover:scale-[1.09] group-hover:opacity-70 lg:h-[28vh] 2xl:h-[32vh]" />
                        </Link>
                        <span
                            className="border-primary-400/10 absolute left-2.5 top-1.5 z-10 flex translate-x-[-50%] transform items-center gap-1 rounded-md border-t bg-background-token/70 px-2 py-1 text-xs font-semibold leading-4 opacity-0 shadow-md shadow-[rgb(49,58,80)] transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                            style={{
                                backdropFilter: "blur(2px)",
                                WebkitBackdropFilter: "blur(2px)",
                            }}
                        >
                            <span className="">{media.averageRating}</span>
                            <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="h-3 w-3 fill-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </span>
                        <div
                            className="absolute bottom-[-5%] z-50 flex w-[89%] flex-col rounded-md border-t border-main-dark/10 bg-main/70 p-[1rem] px-2 py-1 opacity-0 shadow-md shadow-main-dark transition-all duration-300 group-hover:bottom-1 group-hover:opacity-100 lg:left-2.5 lg:rounded-b-md xl:left-4"
                            style={{
                                backdropFilter: "blur(2px)",
                                WebkitBackdropFilter: "blur(2px)",
                            }}
                        >
                            <section className="z-50 flex items-center justify-between">
                                <button type="button" className="rounded-md transition-all duration-200 hover:bg-main-primary/30">
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                                    </svg>
                                </button>
                                <Link href={`/info/${media.id}`} className="rounded-md transition-all duration-200 hover:bg-main-primary/30">
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4" />
                                        <path d="M12 8h.01" />
                                    </svg>
                                </Link>
                                <button type="button" className="rounded-md transition-all duration-200 hover:bg-main-primary/30">
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md transition-all duration-200 hover:bg-main-primary/30"
                                    onClick={() => {
                                        setShowModel(!showModel);
                                    }}
                                >
                                    <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" x2="12" y1="5" y2="19"></line>
                                        <line x1="5" x2="19" y1="12" y2="12" />
                                    </svg>
                                </button>
                            </section>
                        </div>
                    </section>
                    <footer className="flex flex-col p-[1rem] pt-[0px]">
                        <ul className="">
                            <li className="line-clamp-1 w-full text-lg font-semibold text-slate-300">{media.title.english ?? media.title.romaji ?? media.title.native}</li>
                            <li className="flex items-center gap-1">
                                {recent ? (
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-main-primary">{media.type === Type.ANIME ? "Episode " : "Chapter "}</span>
                                        <span className="">{media.type === Type.ANIME ? (media as Anime).episodes.latest.latestEpisode : (media as Manga).chapters.latest.latestChapter}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-main-primary">{parseFormat(media.format)}</span>
                                        <svg className="bi bi-diamond-fill inline-block h-2 w-2 fill-main" xmlns="http://www.w3.org/2000/svg" fill="" viewBox="0 0 16 16" aria-hidden="true">
                                            <path fillRule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 0 1 0-2.098L6.95.435z" className="" />
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
    );
};

export default MediaItem;
