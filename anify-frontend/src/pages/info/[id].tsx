/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @next/next/no-img-element */
import axios from "axios";

import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Select from "react-select";
import { useStore } from "zustand";
import Chapter from "~/components/chapter";
import Footer from "~/components/footer";
import Navbar from "~/components/navbar";

import Sidebar from "~/components/sidebar";

import { env } from "~/env.mjs";
import { capitalize, formatCompactNumber, isValidDate, parseFormat } from "~/helper";
import { usePreferredList, useTokens, useUserData } from "~/store/store";
import { type Anime, type Manga, type EpisodeData, type ChapterData, Type, Season, Format, type AnimeRelation, type MangaRelation, type UserData, type UserTokens, type Entry } from "~/types";

import NProgress from "nprogress";

const Info: NextPage<Props> = ({ media, relations, content }) => {
    const [index, setIndex] = useState(0); // Provider index

    const [listData, setListData] = useState({} as Entry);
    const [showList, setShowList] = useState(false);
    const [status, setStatus] = useState("");

    const [showDescription, setShowDescription] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);

    const [currentSearch, setCurrentSearch] = useState("");
    const [subDub, setSubDub] = useState("sub");

    const userData = useStore(useUserData, ((state: any) => state.userData as UserData));
    const userTokens = useStore(useTokens, ((state: any) => state.tokens as UserTokens[]));
    const preferredList = useStore(usePreferredList, ((state: any) => state.preferredList as string));

    const providerSelector = content.map((provider, index) => {
        return {
            value: index,
            label: capitalize(provider.providerId)
        }
    });

    function updateProviderIndex(data: { value: number, label: string } | null) {
        const curIndex = index;
        document.querySelector("#provider-" + String(curIndex))?.classList.add("hidden");

        const newIndex = data?.value ?? 0;
        setIndex(newIndex);

        document.querySelector("#provider-" + String(newIndex))?.classList.remove("hidden");
    }

    // Pagination
    const chaptersPerPage = media.type === "ANIME" ? 12 : 24;
    const startIndex = (currentPage - 1) * chaptersPerPage;
    const endIndex = startIndex + chaptersPerPage;

    //const totalPages = Math.ceil(media.type === "ANIME" ? (content as EpisodeData[])[index]?.episodes?.length ?? 0 : ((content as ChapterData[])[index]?.chapters?.length ?? 0) / chaptersPerPage);

    const totalPages = Math.ceil(media.type === "ANIME" ? (content as EpisodeData[])[index]?.episodes.filter((episode) => {
        if (subDub === "dub") {
            return episode.hasDub;
        } else {
            return true;
        }
    }).length ?? 0 : ((content as ChapterData[])[index]?.chapters?.length ?? 0) / chaptersPerPage);

    const pagination = [];

    if (media.type != "ANIME") {
        for (let index = 0; index < totalPages; index++) {
            pagination.push(
                <button key={index} type="button" className={`rounded relative pointer flex items-center px-3 overflow-hidden bg-background-light text-sm min-h-[1.75rem] min-w-[1.75rem] justify-center transition-all duration-150 ${index + 1 === currentPage ? "bg-main" : "hover:bg-background-light/80"}`} onClick={() => {
                    handlePageChange(index + 1)
                }}>
                    <span className="flex relative items-center justify-center font-medium select-none text-white">{index + 1}</span>
                </button>
            )
        }
    } else {
        const getPageNumbers = () => {
            const pageNumbers = [];
            for (let i = 1; i <= totalPages; i += chaptersPerPage) {
                pageNumbers.push(i);
            }
            return pageNumbers;
        };

        getPageNumbers().map((pageNumber, index:number) => {
            pagination.push(
                <button key={index} type="button" className={`rounded relative pointer flex items-center px-3 overflow-hidden bg-background-light text-sm min-h-[1.75rem] min-w-[1.75rem] justify-center transition-all duration-150 ${index + 1 === currentPage ? "bg-main" : "hover:bg-background-light/80"}`} onClick={() => {
                    handlePageChange(index + 1)
                }}>
                    <span className="flex relative items-center justify-center font-medium select-none text-white">{index + 1}</span>
                </button>
            )
        })
    }

    const handlePageChange = (pageNumber:number) => {
        setCurrentPage(pageNumber);
    };

    const handleListRequest = async(): Promise<Entry | undefined> => {
        NProgress.start();

        if (!userData || !userTokens || !Array.isArray(userTokens)) {
            console.log("No user data or tokens");
            
            NProgress.done();
            return;
        }

        if (preferredList) {
            if ((userData as any)[preferredList + "Id"] && userTokens?.find((token) => { return token.id === preferredList })?.accessToken) {
                const data = await (await axios.post(`/api/fetchEntry`, {
                    provider: preferredList,
                    userId: (userData as any)[preferredList + "Id"],
                    accessToken: userTokens?.find((token) => { return token.id === preferredList })?.accessToken,
                    mediaId: preferredList === "anilist" ? media.id : media.mappings.find((data) => { return data.providerId === preferredList })?.id ?? ""
                })).data as Entry;
    
                NProgress.done();
                return data;
            }
        } else {
            console.log("No preferred list");
        }

        NProgress.done();
    };

    const listStatus = [
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

    const saveEntry = async() => {
        NProgress.start();
        
        const listEntries = {
            status: status,
            score: Number((document.querySelector("#score") as HTMLInputElement).value),
            progress: Number((document.querySelector("#progress") as HTMLInputElement).value),
            startedAt: String((document.querySelector("#startDate") as HTMLInputElement).value),
            completedAt: String((document.querySelector("#finishDate") as HTMLInputElement).value),
            repeat: Number((document.querySelector("#repeats") as HTMLInputElement).value),
            notes: String((document.querySelector("#notes") as HTMLInputElement).value),
        };

        if (media.type === Type.MANGA) {
            Object.assign(listEntries, {
                progressVolumes: Number((document.querySelector("#progressVolumes") as HTMLInputElement).value),
            });
        }

        if (Number.isNaN(listEntries.score)) {
            listEntries.score = listData.score;
        }
        if (Number.isNaN(listEntries.progress)) {
            listEntries.progress = listData.progress;
        }
        if (Number.isNaN(listEntries.repeat)) {
            listEntries.repeat = listData.repeat;
        }
        if (!isValidDate(listEntries.startedAt)) {
            Object.assign(listEntries, { startedAt: listData.startedAt });
        }
        if (!isValidDate(listEntries.completedAt)) {
            Object.assign(listEntries, { completedAt: listData.completedAt });
        }
    
        if (!Array.isArray(userTokens)) {
            NProgress.done();
            setShowList(false);
            return;
        }

        Object.assign(listData, {
            status: listEntries.status,
            score: listEntries.score,
            progress: listEntries.progress,
            startedAt: listEntries.startedAt,
            completedAt: listEntries.completedAt,
            repeat: listEntries.repeat,
            notes: listEntries.notes
        })

        if (media.type === Type.MANGA) {
            Object.assign(listData, {
                progressVolumes: (listEntries as any).progressVolumes
            })
        }
        
        if (preferredList === "anilist") {
            const token = userTokens?.find((token) => { return token.id === "anilist" })?.accessToken;
            const data = await (await axios.post(`/api/saveEntry`, {
                provider: "anilist",
                userId: userData.anilistId,
                accessToken: token,
                entry: listData
            })).data as Entry;

            NProgress.done();

            setShowList(false);
            return data;
        }
        if (preferredList === "mal") {
            const token = userTokens?.find((token) => { return token.id === "mal" })?.accessToken;
            const data = await (await axios.post(`/api/saveEntry`, {
                provider: "mal",
                userId: userData.malId,
                accessToken: token,
                entry: listEntries
            })).data as Entry;

            NProgress.done();

            setShowList(false);
            return data;
        }
        if (preferredList === "simkl") {
            const token = userTokens?.find((token) => { return token.id === "simkl" })?.accessToken;
            const data = await (await axios.post(`/api/saveEntry`, {
                provider: "simkl",
                userId: userData.simklId,
                accessToken: token,
                entry: listEntries
            })).data as Entry;

            NProgress.done();

            setShowList(false);
            return data;
        }
    }

    return (
        <>
            <Head>
                <title>{media.title.english ?? media.title.romaji ?? media.title.native ?? ""}</title>
                <meta name="title" content={media.title.english ?? media.title.romaji ?? media.title.native ?? ""} />
                <meta name="description" content={media.description ?? ""} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={"https://anify.tv/info/" + media.id} />
                <meta property="og:title" content={media.title.english ?? media.title.romaji ?? media.title.native ?? ""} />
                <meta property="og:description" content={media.description ?? ""} />
                <meta property="og:image" content={"https://anify.tv/api/info?id=" + media.id} />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={"https://anify.tv/info/" + media.id} />
                <meta property="twitter:title" content={media.title.english ?? media.title.romaji ?? media.title.native ?? ""} />
                <meta property="twitter:description" content={media.description ?? ""} />
                <meta property="twitter:image" content={"https://anify.tv/api/info?id=" + media.id} />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Sidebar active={media.type === Type.ANIME ? "anime" : media.format === Format.NOVEL ? "novel" : "manga"} />
            <Navbar active={media.type === Type.ANIME ? "anime" : media.format === Format.NOVEL ? "novel" : "manga"} />
            <main className="pl-0 md:pl-14">
                <div className="flex-grow mb-8">
                    <div>
                        <div className="grid gap-[1rem] grid-areas-infoMobile lg:grid-areas-info px-4 grid-cols-[100px_auto] lg:grid-cols-[1fr_200px_minmax(0,calc(1240px-3.5rem))_1fr]">
                            <div className="absolute top-[var(--banner-overlap)] left-0 z-[0] w-full h-[100%] blur-xl" style={{
                                background: `radial-gradient(circle at top, rgba(25,26,28,.8), #191a1c 75%), no-repeat top 35% center / 100% url("${media.bannerImage ?? ""}")`
                            }} />
                            <div className="h-[calc(var(--banner-height)+var(--banner-overlap))] left-0 absolute right-0 z-[1] w-auto block top-[var(--banner-top)]" style={{
                                clip: "rect(0,auto,auto,0)",
                                clipPath: "inset(0 0)"
                            }}>
                                <div className="fixed bg-cover w-full h-[calc(var(--banner-height)+var(--banner-overlap))]" style={{
                                    backgroundImage: `url("${media.bannerImage ?? ""}")`,
                                }} />
                                <div className="h-auto bottom-0 right-0 top-0 w-full absolute pointer-events-none shadow-2xl" style={{
                                    background: "linear-gradient(180deg,rgba(0,0,0,.4) 35.51%,rgba(0,0,0,.64))",
                                    backdropFilter: "blur(4px)",
                                    WebkitBackdropFilter: "blur(5px)"
                                }} />
                            </div>
                            <div className="grid-in-art z-10 mt-24">
                                <Link href={media.coverImage ?? ""} className="group flex items-start relative mb-auto select-none" target="_blank">
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center inset-0 absolute bg-black bg-opacity-50 pointer-events-none rounded">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-white">
                                            <path fill="currentColor" d="m9.5 13.09 1.41 1.41-4.5 4.5H10v2H3v-7h2v3.59l4.5-4.5m1.41-3.59L9.5 10.91 5 6.41V10H3V3h7v2H6.41l4.5 4.5m3.59 3.59 4.5 4.5V14h2v7h-7v-2h3.59l-4.5-4.5 1.41-1.41M13.09 9.5l4.5-4.5H14V3h7v7h-2V6.41l-4.5 4.5-1.41-1.41Z"></path>
                                        </svg>
                                    </div>
                                    <img src={media.coverImage ?? ""} className="rounded shadow-md w-full h-auto" loading="lazy" alt={`${(media.title.english ?? media.title.romaji ?? media.title.native ?? "")} Cover`} />
                                </Link>
                            </div>
                            <div className="mt-24 z-10 flex flex-col grid-in-title relative min-w-0 pb-[.5rem] pl-[.5rem] pr-[.5rem] justify-end lg:mb-[calc(var(--banner-height)/4)]">
                                <span className="mb-1 line-clamp-2 text-3xl text-white font-bold" style={{
                                    textShadow: "rgba(0, 0, 0, 0.3) 1px 2px 4px"
                                }}>{media.title.english ?? media.title.romaji ?? media.title.native}</span>
                                <span className="font-normal line-clamp-2 text-base sm:text-xl lg:inline-block leading-5 text-white">{media.title.romaji}</span>
                                <span className="flex-grow hidden sm:block text-white line-clamp-2">{media.title.native}</span>
                            </div>
                            <div className="sm:ml-2 relative grid-in-buttons z-10">
                                <div className="flex gap-2 sm:mb-0 mb-2 flex-wrap">
                                        <Link href={`${media.type === Type.ANIME ? `/watch/${media.id}/${content[index]?.providerId ?? ""}/${encodeURIComponent((content[index] as EpisodeData)?.episodes[0]?.id ?? "")}/${subDub}` : `/read/${media.id}/${content[index]?.providerId ?? ""}/${encodeURIComponent((content[index] as ChapterData)?.chapters[(content[index] as ChapterData)?.chapters?.length - 1]?.id ?? "")}`}`} className="flex relative items-center justify-center font-medium">
                                            <button type="button" className="transition-all duration-150 hover:bg-main-dark bg-main min-w-[13.75rem] min-h-[3rem] flex flex-grow-0 whitespace-nowrap sm:px-3 rounded relative items-center px-3 overflow-hidden pointer justify-center text-white" style={{
                                                boxShadow: "0 0 24px -8px rgb(76, 184, 117)",
                                            }}>
                                                {media.type === "ANIME" ? "Watch Now" : "Read Now"}
                                            </button>
                                        </Link>
                                    <div className="z-1 relative">
                                        <div>
                                            <button type="button" className="transition-all duration-150 hover:bg-background-light min-w-[3rem] min-h-[3rem] rounded md-btn flex items-center justify-center overflow-hidden accent !px-0 pointer relative bg-background-light" onClick={() => {
                                                if (listData.listId) setShowList(true); else {
                                                    void handleListRequest().then((data) => {
                                                        if (!data) return;
                                                        setListData(data ?? {} as Entry);
                                                        setShowList(true);
                                                    });
                                                }
                                            }}>
                                                <span className="flex relative items-center justify-center font-medium select-none text-white">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="inline-flex items-center flex-shrink-0 h-[1.5rem] justify-center w-[1.5rem]">
                                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path>
                                                    </svg>
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid-in-stats sm:mx-2 mt-auto sm:mt-0 z-20">
                                <div className="flex gap-2 flex-wrap items-center text-sm sm:text-base">
                                    <span className="text-primary flex items-center relative group text-main cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="mr-1" viewBox="0 0 24 24">
                                            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                        </svg>
                                        {media.averageRating}
                                        <div className="transition-all duration-150 transform-none bg-background-light rounded-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:scale-105 absolute top-8 p-3" style={{
                                            boxShadow: "0 1px 12px #000a"
                                        }}>
                                            <div className="flex flex-row gap-5">
                                                {media.rating?.anilist && media.rating.anilist != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-white text-base">AniList</span>
                                                        <span className="text-gray-300 text-sm">{media.rating.anilist}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.mal && media.rating.mal != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-white text-base">MAL</span>
                                                        <span className="text-gray-300 text-sm">{media.rating.mal}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.kitsu && media.rating.kitsu != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-white text-base">Kitsu</span>
                                                        <span className="text-gray-300 text-sm">{media.rating.kitsu}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.simkl && media.rating.simkl != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-white text-base">Simkl</span>
                                                        <span className="text-gray-300 text-sm">{media.rating.simkl}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </span>
                                    <span className="text-zinc-400 flex items-center cursor-pointer group relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="mr-1">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"></path>
                                        </svg>
                                        {formatCompactNumber(Math.round(media.averagePopularity))}
                                    </span>
                                </div>
                            </div>
                            <div className="grid-in-info sm:mx-2 z-10">
                                <div className="flex gap-2 flex-wrap items-center">
                                    <div className="flex flex-wrap gap-2" style={{
                                        maxHeight: "calc(2em + 0.25rem)"
                                    }}>
                                        {media.genres.slice(0, 7).map((genre, index:number) => {
                                            return (
                                                <span key={index} className="inline-block rounded-sm p-[0_0.375rem] capitalize mb-auto mt-auto bg-zinc-700 text-xs text-white">{genre.toUpperCase()}</span>
                                            )
                                        })}
                                    </div>
                                    {media.type === Type.ANIME && (media as Anime).season ? (
                                        <span className="inline-flex items-center gap-2 p-0 mb-[-.3125rem] mt-[-.3125rem] text-main-text">
                                            {(media as Anime).season === Season.WINTER ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/>
                                                    <path d="m20 16-4-4 4-4"/>
                                                    <path d="m4 8 4 4-4 4"/>
                                                    <path d="m16 4-4 4-4-4"/>
                                                    <path d="m8 20 4-4 4 4"/>
                                                </svg>
                                            ) : (media as Anime).season === Season.SPRING ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                                                    <path d="M16 14v6"/>
                                                    <path d="M8 14v6"/>
                                                    <path d="M12 16v6"/>
                                                </svg>
                                            ) : (media as Anime).season === Season.SUMMER ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <circle cx="12" cy="12" r="4"/>
                                                    <path d="M12 2v2"/>
                                                    <path d="M12 20v2"/>
                                                    <path d="m4.93 4.93 1.41 1.41"/>
                                                    <path d="m17.66 17.66 1.41 1.41"/>
                                                    <path d="M2 12h2"/>
                                                    <path d="M20 12h2"/>
                                                    <path d="m6.34 17.66-1.41 1.41"/>
                                                    <path d="m19.07 4.93-1.41 1.41"/>
                                                </svg>
                                            ) : (media as Anime).season === Season.FALL ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                                                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                                                </svg>
                                            ) : ""}
                                            <span className="text-white">{capitalize((media as Anime).season)} {media.year ?? "?"}</span>
                                        </span>
                                    ) : ""}
                                </div>
                            </div>
                            <div className="min-w-0 grid-in-synopsis z-10 text-white p-2 bg-gray-300/5 hover:bg-gray-200/10 rounded-md cursor-pointer transition-all duration-150 ease-in-out" onClick={() => {
                                setShowDescription(!showDescription)
                            }}>
                                <div className={`break-words ${!showDescription ? "line-clamp-3" : "line-clamp-none"} text-sm lg:text-base transition-all duration-200`}>
                                    <div dangerouslySetInnerHTML={{
                                        __html: media.description ?? ""
                                    }}></div>
                                </div>
                                {!showDescription ? (
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="text-gray-100/50">Show more</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="text-gray-100/50">Show less</span>
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 grid-in-content z-10">
                                <div className="overflow-x-auto mt-2 mb-4">
                                    {/* Select tabs? */}
                                </div>
                                <div className="flex lg:flex-row flex-col-reverse gap-6 items-start">
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 sm:max-w-[400px] min-w-[25%]" style={{
                                        flexBasis: "30%"
                                    }}>
                                        {media.status ? (
                                            <div className="mb-2">
                                                <span className="font-bold mb-2 text-white">Status</span>
                                                <div className="flex gap-2 flex-wrap text-white mt-2">
                                                    <span className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                        <span>{capitalize(media.status)}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                        {(media as Anime).trailer ? (
                                            <div className="mb-2">
                                                <span className="font-bold mb-2 text-white">Trailer</span>
                                                <div className="flex gap-2 flex-wrap text-white mt-2">
                                                    <span className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                        <a href={(media as Anime).trailer ?? "#"} target="_blank">Link</a>
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                        {media.countryOfOrigin ? (
                                            <div className="mb-2">
                                                <span className="font-bold mb-2 text-white">Country</span>
                                                <div className="flex gap-2 flex-wrap text-white mt-2">
                                                    <span className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                        <span>{media.countryOfOrigin}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                        <div className="mb-2">
                                            <span className="font-bold mb-2 text-white">Genres</span>
                                            <div className="flex gap-2 flex-wrap text-white mt-2">
                                                {media.genres.map((genre, index:number) => {
                                                    return (
                                                        <span key={index} className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                            <span>{genre}</span>
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <span className="font-bold mb-2 text-white">Track</span>
                                            <div className="flex gap-2 flex-wrap text-white mt-2">
                                                <a className="bg-background-light inline-flex text-sm items-center gap-2 min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer" href={`https://anilist.co/${media.type?.toLowerCase()}/${media.id}`} target="_blank">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 4.233 4.233" className="">
                                                        <path fill="#19212d" d="M.794 0H3.44c.44 0 .793.354.793.794V3.44c0 .44-.354.793-.793.793H.794A.792.792 0 0 1 0 3.44V.794C0 .354.354 0 .794 0z"></path>
                                                        <path fill="#0af" d="M2.247.794c-.104 0-.16.057-.16.16v.155l.815 2.33h.807c.104 0 .162-.056.162-.16v-.354c0-.104-.058-.161-.162-.161h-.947V.954c0-.103-.057-.16-.161-.16z"></path>
                                                        <path fill="#fff" d="M1.293.794.363 3.44h.722l.158-.458h.786l.154.458h.719L1.976.794zm.114 1.602.225-.733.247.733z"></path>
                                                    </svg>
                                                    <span>AniList</span>
                                                </a>
                                                {media.mappings.find((data) => { return data.providerId === "mal" })?.id ? (
                                                    <a className="bg-background-light inline-flex text-sm items-center gap-2 min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer" href={`https://myanimelist.net/${media.type?.toLowerCase()}/${media.mappings.find((data) => { return data.providerId === "mal" })?.id ?? ""}`} target="_blank">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 4.233 4.233" className="">
                                                            <path fill="#2e51a2" d="M.794 0H3.44c.44 0 .793.354.793.794V3.44c0 .44-.354.793-.793.793H.794A.792.792 0 0 1 0 3.44V.794C0 .354.354 0 .794 0z"></path>
                                                            <path fill="#fff" d="M1.935 2.997a1.459 1.459 0 0 1-.149-.378 1.074 1.074 0 0 1-.032-.317.99.99 0 0 1 .037-.325c.077-.286.267-.479.53-.538.085-.019.155-.023.345-.023h.17l.083.295-.461.004-.042.014a.385.385 0 0 0-.225.195.582.582 0 0 0-.048.126c.128.01.212.006.36.006v-.297h.376v1.059h-.381v-.466h-.212c-.206 0-.212 0-.212.01a1.274 1.274 0 0 0 .152.458c-.007.008-.266.195-.27.197-.004.001-.013-.008-.02-.02zM.265 1.416H.6l.3.428.303-.428h.336v1.402H1.2l-.002-.85-.302.378-.291-.383-.003.855H.265zm2.9.005h.333v1.095l.47.003-.073.291-.73.003z"></path>
                                                        </svg>
                                                        <span>MyAnimeList</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => { return data.providerId === "kitsu" })?.id ? (
                                                    <a className="bg-background-light inline-flex text-sm items-center gap-2 min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer" href={`https://kitsu.io/${media.type?.toLowerCase()}/${media.mappings.find((data) => { return data.providerId === "kitsu" })?.id ?? ""}`} target="_blank">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 4.233 4.233" className="">
                                                            <path fill="#493c47" d="M.794 0H3.44c.44 0 .793.354.793.794V3.44c0 .44-.354.793-.793.793H.794A.792.792 0 0 1 0 3.44V.794C0 .354.354 0 .794 0z"></path>
                                                            <path fill="#e75e45" d="M1.551.266a.107.107 0 0 0-.079.018c-.008.005-.013.011-.02.018L1.44.32a.732.732 0 0 0-.121.527 1.284 1.284 0 0 0-.12.071c-.007.005-.065.045-.11.087A.74.74 0 0 0 .554.928L.532.933C.524.937.515.94.509.945a.109.109 0 0 0-.03.148v.003l.006.008c.088.12.188.225.296.318l.003.003c.07.06.203.146.3.181 0 0 .6.231.63.245.012.004.03.01.037.01a.106.106 0 0 0 .125-.084.274.274 0 0 0 .003-.038V1.06a1.211 1.211 0 0 0-.061-.345L1.816.71a1.836 1.836 0 0 0-.19-.39L1.623.31 1.62.308a.106.106 0 0 0-.069-.042zM1.533.43c.057.095.105.193.143.296a1.314 1.314 0 0 0-.224.06.605.605 0 0 1 .081-.356zm1.102.558a1.17 1.17 0 0 0-.588.126c-.01.005-.022.01-.033.017v.605c0 .008 0 .04-.005.066a.238.238 0 0 1-.246.193.399.399 0 0 1-.095-.021l-.525-.204a1.429 1.429 0 0 0-.05-.02 4.781 4.781 0 0 0-.59.592l-.011.013a.108.108 0 0 0 0 .123.11.11 0 0 0 .083.047.105.105 0 0 0 .065-.018 3.096 3.096 0 0 1 .668-.364.11.11 0 0 1 .127.02c.037.038.039.1.007.14l-.036.06a3.13 3.13 0 0 0-.304.665l-.005.019v.001a.1.1 0 0 0 .016.084.11.11 0 0 0 .085.046.101.101 0 0 0 .064-.019.144.144 0 0 0 .024-.021c.001-.004.005-.007.006-.01a2.93 2.93 0 0 1 .273-.332 3.11 3.11 0 0 1 1.666-.929c.005-.002.01-.001.015-.001a.067.067 0 0 1 .063.07.065.065 0 0 1-.052.06c-.603.129-1.69.845-1.31 1.885a.318.318 0 0 0 .02.041.11.11 0 0 0 .083.047c.018 0 .07-.005.102-.062.061-.116.177-.246.513-.385.935-.387 1.09-.94 1.106-1.291v-.02A1.19 1.19 0 0 0 2.635.988zm-1.92.06a.592.592 0 0 1 .268.06 1.164 1.164 0 0 0-.138.188 1.803 1.803 0 0 1-.224-.24.602.602 0 0 1 .094-.009zm1.367 2.01c.194.314.533.34.533.34-.347.145-.484.288-.557.404a1.016 1.016 0 0 1 .024-.744z"></path>
                                                        </svg>
                                                        <span>Kitsu</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => { return data.providerId === "simkl" })?.id ? (
                                                    <a className="bg-background-light inline-flex text-sm items-center gap-2 min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer" href={`https://simkl.com/${media.type?.toLowerCase()}/${media.mappings.find((data) => { return data.providerId === "simkl" })?.id ?? ""}`} target="_blank">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><title>Simkl</title><path d="M3.84 0A3.832 3.832 0 0 0 0 3.84v16.32A3.832 3.832 0 0 0 3.84 24h16.32A3.832 3.832 0 0 0 24 20.16V3.84A3.832 3.832 0 0 0 20.16 0zm8.567 4.11c2.074 0 3.538.061 4.393.186 1.127.168 1.94.46 2.438.877.672.578 1.009 1.613 1.009 3.104 0 .161-.004.417-.01.768h-4.234c-.014-.358-.039-.607-.074-.746-.098-.41-.42-.64-.966-.692-.484-.043-1.66-.066-3.53-.066-1.85 0-2.946.056-3.289.165-.385.133-.578.474-.578 1.024 0 .528.203.851.61.969.343.095 1.887.187 4.633.275 2.487.073 4.073.165 4.76.275.693.11 1.244.275 1.654.495.41.22.737.532.983.936.37.595.557 1.552.557 2.873 0 1.475-.182 2.557-.546 3.247-.364.683-.96 1.149-1.785 1.398-.812.25-3.05.374-6.71.374-2.226 0-3.832-.062-4.82-.187-1.204-.147-2.068-.434-2.593-.86-.567-.456-.903-1.1-1.008-1.93a10.522 10.522 0 0 1-.085-1.434v-.789H7.44c-.007.74.136 1.216.43 1.428.154.102.33.167.525.203.196.037.54.063 1.03.077a166.2 166.2 0 0 0 2.405.022c1.862-.007 2.94-.018 3.234-.033.553-.044.917-.12 1.092-.23.245-.161.368-.52.368-1.077 0-.38-.078-.648-.231-.802-.211-.212-.712-.325-1.503-.34-.547 0-1.688-.044-3.425-.132-1.794-.088-2.956-.14-3.488-.154-1.387-.044-2.364-.212-2.932-.505-.728-.373-1.205-1.01-1.429-1.91-.126-.498-.189-1.15-.189-1.956 0-1.698.309-2.895.925-3.59.462-.527 1.163-.875 2.102-1.044.848-.146 2.865-.22 6.053-.22z" fill="white"></path></svg>
                                                        <span>Simkl</span>
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        {media.synonyms.length > 0 ? (
                                            <div className="mb-2">
                                                <span className="font-bold mb-2 text-white">Alternate Titles</span>
                                                <div className="flex gap-2 flex-wrap text-white mt-2">
                                                    {media.title.english ? (
                                                        <span className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                            <span>{media.title.english}</span>
                                                        </span>
                                                    ) : null}
                                                    {media.title.romaji ? (
                                                        <span className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                            <span>{media.title.romaji}</span>
                                                        </span>
                                                    ) : null}
                                                    {media.title.native ? (
                                                        <span className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                            <span>{media.title.native}</span>
                                                        </span>
                                                    ) : null}
                                                    {media.synonyms.map((synonym, index:number) => {
                                                        return (
                                                            <span key={index} className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                                <span>{synonym}</span>
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                        {media.tags.length > 0 ? (
                                            <div className="mb-2">
                                                <span className="font-bold mb-2 text-white">Tags</span>
                                                <div className="flex gap-2 flex-wrap text-white mt-2">
                                                    {media.tags.map((tag, index:number) => {
                                                        return (
                                                            <span key={index} className="bg-background-light inline-flex text-sm items-center min-h-[1.75rem] p-[.3125rem_.5rem] rounded-sm transition-all duration-200 ease-in-out hover:bg-main/80 cursor-pointer">
                                                                <span>{tag}</span>
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex-grow w-full">
                                        <div className="relative w-full sm:max-w-[30%] mb-4">
                                            <input id="search" type="text" className="bg-gray-50/20 block w-full border-2 border-zinc-600 rounded-lg px-4 py-2 pl-10 leading-5 text-sm text-white placeholder-gray-300 focus:outline-none focus:border-main focus:placeholder-gray-100 focus:ring-1 focus:ring-main focus:ring-opacity-50 transition duration-150" placeholder="Search..." onChange={() => {
                                                setCurrentSearch((document.getElementById("search") as HTMLInputElement).value);
                                            }} />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="w-5 h-5 fill-current text-gray-50" aria-hidden="true" viewBox="0 0 512 512">
                                                    <path fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z"></path>
                                                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" d="M338.29 338.29L448 448"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        {media.type === "ANIME" ? (
                                            <div className="flex flex-row items-center gap-3 mb-2">
                                                <span className="text-white font-medium">{subDub === "sub" ? "Subbed" : "Dubbed"}</span>
                                                <div className={`toggle  ${subDub === "sub" ? "active" : ""}`} id="subDub" onClick={() => {
                                                    setSubDub(subDub === "sub" ? "dub" : "sub");
                                                }}></div>
                                            </div>
                                        ) : null}
                                        <Select options={providerSelector} classNames={{
                                            control: (state) => state.isFocused ? "border-main-300" : "border-none"
                                        }} styles={{
                                            container: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#333333",
                                                border: "none",
                                                borderRadius: "0.25rem",
                                            }),
                                            control: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#333333",
                                                border: "none"
                                            }),
                                            input: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#333333",
                                                border: "none"
                                            }),
                                            menu: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#1f1f1f",
                                                border: "none",
                                            }),
                                            menuList: (baseStyles) => ({
                                                ...baseStyles,
                                                width: "100%",
                                                height: "100%",
                                            }),
                                            noOptionsMessage: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                            }),
                                            placeholder: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                            }),
                                            singleValue: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                                height: "100%",
                                                position: "relative",
                                                top: "10%",
                                                overflow: "initial",
                                            }),
                                            valueContainer: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white"
                                            }),
                                            option: (baseStyles) => ({
                                                ...baseStyles,
                                                backgroundColor: "#1f1f1f",
                                                color: "white",
                                                transition: "0.1s all",
                                                cursor: "pointer",
                                                ":hover": {
                                                    backgroundColor: "#1f1f1f"
                                                },
                                                ":active": {
                                                    color: "white",
                                                    backgroundColor: "#1f1f1f"
                                                },
                                                lineHeight: "1.25rem",
                                                height: "100%"
                                            }),
                                            indicatorSeparator: (baseStyles) => ({
                                                ...baseStyles,
                                                display: "none"
                                            }),
                                            dropdownIndicator: (baseStyles) => ({
                                                ...baseStyles,
                                                backgroundColor: "rgb(var(--blue-300));",
                                                color: "white",
                                                transition: "0.1s all",
                                                ":hover": {
                                                    color: "rgba(255, 255, 255, 0.7)"
                                                },
                                                ":active": {
                                                    color: "rgba(255, 255, 255, 0.5)",
                                                }
                                            }),
                                        }} defaultValue={providerSelector[0]} isSearchable={false} name="chapter_list" onChange={updateProviderIndex} />
                                        <br className="lg:hidden" />
                                        {/* Pagination Buttons */}
                                        {pagination.length > 1 ? (
                                            <div className="mt-3 mb-3">
                                                <div className="flex justify-center gap-3">
                                                    <button type="button" className="rounded relative pointer flex items-center px-3 overflow-hidden bg-background-light text-sm min-h-[1.75rem] min-w-[1.75rem] justify-center hover:bg-background-light/80 transition-all duration-150" onClick={() => {
                                                        handlePageChange(currentPage > 1 ? currentPage - 1 : 1)
                                                    }}>
                                                        <span className="flex relative items-center justify-center font-medium select-none text-white">Previous</span>
                                                    </button>
                                                    <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[1.75rem] max-w-[50%] sm:max-w-[80%]">
                                                        {/* Buttons to go to pagination page */}
                                                        {pagination}
                                                    </div>
                                                    <button type="button" className="rounded relative pointer flex items-center px-3 overflow-hidden bg-background-light text-sm min-h-[1.75rem] min-w-[1.75rem] justify-center hover:bg-background-light/80 transition-all duration-150" onClick={() => {
                                                        if (currentPage + 1 > pagination.length) return;
                                                        handlePageChange(currentPage < endIndex ? currentPage + 1 : endIndex - 1)
                                                    }}>
                                                        <span className="flex relative items-center justify-center font-medium select-none text-white">Next</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="my-6">
                                                {/* Not necessary to have pagination buttons */}
                                            </div>
                                        )}
                                        {content.map((provider, index) => (
                                            <div key={String(index) + "-provider"} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 py-4 text-white ${index > 0 ? "hidden" : ""}`} id={`provider-${index}`}>
                                                {media.type === "ANIME" ? (provider as EpisodeData).episodes.map((episode, index:number) => {
                                                    if (currentSearch.length > 0) {
                                                        if (episode.title.toLowerCase().includes(currentSearch.toLowerCase()) || (currentSearch.toLowerCase().includes(String(episode.number ?? index)))) {
                                                            if (subDub === "dub" && episode.hasDub) {
                                                                return (
                                                                    <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />
                                                                )   
                                                            } else if (subDub === "sub") {
                                                                // Edgecase
                                                                if (provider.providerId !== "GogoAnime (Dub)") {
                                                                    return (
                                                                        <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />
                                                                    )
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        if ((index >= startIndex && index < endIndex)) {
                                                            if (subDub === "dub" && episode.hasDub) {
                                                                return (
                                                                    <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />
                                                                )   
                                                            } else if (subDub === "sub") {
                                                                // Edgecase
                                                                if (provider.providerId !== "GogoAnime (Dub)") {
                                                                    return (
                                                                        <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />
                                                                    )
                                                                }
                                                            }
                                                        }
                                                    }
                                                }) : (provider as ChapterData).chapters.map((chapter, index:number) => {
                                                    if (currentSearch.length > 0) {
                                                        if (chapter.title.toLowerCase().includes(currentSearch.toLowerCase()) || (currentSearch.toLowerCase().includes(String(chapter.number ?? index)))) {
                                                            return (
                                                                <Chapter key={String(index) + "-chapter"} chapter={chapter} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />
                                                            )
                                                        }
                                                    } else {
                                                        if ((index >= startIndex && index < endIndex)) {
                                                            return (
                                                                <Chapter key={String(index) + "-chapter"} chapter={chapter} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />
                                                            )
                                                        }
                                                    }
                                                })}
                                            </div>
                                        ))}
                                        <div className="mt-5 mb-5 lg:grid flex flex-col" style={{
                                            gridColumnGap: "30px",
                                            gridRowGap: "15px",
                                            gridTemplateColumns: "repeat(3,1fr)"
                                        }}>
                                            {relations.slice(0, 21).map((relation, index) => (
                                                <div key={index} className="inline-grid grid-cols-[85px_auto] rounded-sm h-[115px]">
                                                    <Link href={`/info/${relation.id}`} className="rounded-[3px_0_0_3px] bg-cover bg-no-repeat" style={{
                                                        backgroundImage: `url(${relation.coverImage ?? ""})`,
                                                    }} />
                                                    <div className="bg-background-light rounded-[0_3px_3px_0] p-[12px] relative">
                                                        <div className="text-main font-semibold text-xs">
                                                            <span>{relation.relationType === "SIDE_STORY" ? "Side Story" : relation.relationType === "SPIN_OFF" ? "Spin-Off" : capitalize(relation.relationType)}</span>
                                                        </div>
                                                        <Link href={`/info/${relation.id}`} className="line-clamp-1 text-[rgb(159,173,189)] hover:text-main-primary transition-all duration-200 ease-in-out">
                                                            <span>{relation.title.english ?? relation.title.romaji ?? relation.title.native ?? ""}</span>
                                                        </Link>
                                                        <div className="bottom-[12px] text-main-text absolute left-[12px] font-light text-xs">{parseFormat(relation.format)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </main>
            <div className={`fixed top-0 left-0 right-0 bottom-0 mx-auto overflow-auto z-50 ${showList ? "translate-y-0" : "pointer-events-none opacity-0 -translate-y-5"} transition-all duration-200 ease-in-out`} style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)"
            }}>
                <div className="mt-[15vh] bg-[0_0] rounded-md w-full md:max-w-[80%] relative m-[0_auto_50px]" style={{
                    boxShadow: "0 2px 33px rgba(0,0,0,.48)",
                }}>
                    <div className="p-0 z-20 relative bg-background rounded-[3px_3px_0_0]">
                        <span className=""></span>
                        <button type="button" className="z-10 absolute top-[20px] right-[20px] p-0 bg-[0_0] cursor-pointer outline-none text-slate-200 font-bold transition-all duration-200 ease-in-out hover:text-slate-400" onClick={() => {
                            setShowList(false);
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div className="p-0 bg-[0_0]">
                        <div className="bg-cover bg-no-repeat h-[180px] relative" style={{
                            boxShadow: "inset 0 0 250px #2f3133",
                            backgroundPosition: "50%",
                            backgroundImage: `url(${media.bannerImage ?? ""})`
                        }}>
                            <div className="flex items-end justify-end h-full relative z-10 p-[30px] lg:p-[50px] pb-0">
                                <div className="rounded-sm mb-[-30px] overflow-hidden max-w-[100px]">
                                    <img src={media.coverImage ?? ""} className="w-full" alt={`${media.title.english ?? media.title.romaji ?? media.title.native ?? ""}-cover`} loading="lazy" />
                                </div>
                                <span className="p-[20px] text-xl text-white font-medium drop-shadow-lg line-clamp-3">{(media.title.english ?? media.title.romaji ?? media.title.native)}</span>
                                <div className="ml-auto mb-[13px] mr-[10px] opacity-90 bg-[0_0] flex items-center rounded-md h-[35px] cursor-pointer p-[0_14px] justify-center">
                                    <svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-[1rem] h-[1rem] inline-block">
                                        <path fill="#fff" d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z" className=""></path>
                                    </svg>
                                </div>
                                <button className="p-[8px_14px] cursor-pointer rounded-md mb-[15px] bg-main text-white" onClick={() => {
                                    void saveEntry();
                                }}>Save</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-[auto_16px] p-[50px] pt-[70px] bg-background">
                            <div className="block lg:grid grid-areas-listEditor justify-around" style={{
                                gridGap: "40px"
                            }}>
                                <div className="grid-in-status lg:mb-0 mb-[25px]">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">
                                        Status
                                    </span>
                                    <div className="w-full bg-background-dark rounded-md relative z-10">
                                        <Select options={listStatus} classNames={{
                                            control: (state) => state.isFocused ? "border-main-300" : "border-none"
                                        }} className="z-50" styles={{
                                            container: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#141414",
                                                border: "none",
                                                borderRadius: "0.25rem",
                                                zIndex: "50",
                                            }),
                                            control: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#141414",
                                                border: "none",
                                            }),
                                            input: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#141414",
                                                border: "none"
                                            }),
                                            menu: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white",
                                                backgroundColor: "#333333",
                                                border: "none",
                                                zIndex: "50",
                                            }),
                                            menuList: (baseStyles, state) => ({
                                                ...baseStyles,
                                                width: "100%",
                                                height: "100%",
                                                zIndex: "50",
                                            }),
                                            noOptionsMessage: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white",
                                            }),
                                            placeholder: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white",
                                            }),
                                            singleValue: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white",
                                                height: "100%",
                                                position: "relative",
                                                top: "10%",
                                                overflow: "initial",
                                                zIndex: "50",
                                            }),
                                            valueContainer: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: "white"
                                            }),
                                            option: (baseStyles, state) => ({
                                                ...baseStyles,
                                                backgroundColor: "#333333",
                                                color: "white",
                                                zIndex: "50",
                                                transition: "0.1s all",
                                                cursor: "pointer",
                                                ":hover": {
                                                    backgroundColor: "#1f1f1f"
                                                },
                                                ":active": {
                                                    color: "white",
                                                    backgroundColor: "#1f1f1f"
                                                },
                                                lineHeight: "1.25rem",
                                                height: "100%"
                                            }),
                                            indicatorSeparator: (baseStyles, state) => ({
                                                ...baseStyles,
                                                display: "none"
                                            }),
                                            dropdownIndicator: (baseStyles, state) => ({
                                                ...baseStyles,
                                                backgroundColor: "none",
                                                color: "white",
                                                transition: "0.1s all",
                                                ":hover": {
                                                    color: "rgba(255, 255, 255, 0.7)"
                                                },
                                                ":active": {
                                                    color: "rgba(255, 255, 255, 0.5)",
                                                }
                                            }),
                                        }} defaultValue={listStatus.map((el) => {
                                            if (String(el.value) === listData.status) {
                                                return el;
                                            }
                                        })} isSearchable={false} name="chapter_list" onChange={(data) => {
                                            setStatus(data?.value ?? "");
                                        }} />
                                    </div>
                                </div>
                                <div className="grid-in-score lg:mb-0 mb-[25px] z-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">
                                        Score
                                    </span>
                                    <div className="w-full relative inline-block z-0">
                                        <span className="border-0 right-[-10px] bottom-[1px] top-auto left-auto border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                            background: "0_0"
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m6 9 6 6 6-6"/>
                                            </svg>
                                        </span>
                                        <span className="border-0 right-[-10px] top-[1px] border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                            background: "0_0"
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m18 15-6-6-6 6"/>
                                            </svg>
                                        </span>
                                        <div className="w-full bg-background-dark rounded-md relative z-10">
                                            <input type="text" id="score" className="pl-[15px] pr-[50px] text-left w-full bg-background-dark border-0 outline-none inline-block h-[40px] p-[0_15px] text-white rounded-md" defaultValue={listData.score} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-in-progress lg:mb-0 mb-[25px] z-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">
                                        {media.type === Type.ANIME ? "Episode Progress" : "Chapter Progress"}
                                    </span>
                                    <div className="w-full relative inline-block z-0">
                                        <span className="border-0 right-[-10px] bottom-[1px] top-auto left-auto border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                            background: "0_0"
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m6 9 6 6 6-6"/>
                                            </svg>
                                        </span>
                                        <span className="border-0 right-[-10px] top-[1px] border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                            background: "0_0"
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m18 15-6-6-6 6"/>
                                            </svg>
                                        </span>
                                        <div className="w-full bg-background-dark rounded-md relative z-10">
                                            <input type="text" id="progress" className="pl-[15px] pr-[50px] text-left w-full bg-background-dark border-0 outline-none inline-block h-[40px] p-[0_15px] text-white rounded-md" defaultValue={listData.progress} />
                                        </div>
                                    </div>
                                </div>
                                {media.type === Type.MANGA ? (
                                    <div className="grid-in-volumes lg:mb-0 mb-[25px] z-0">
                                        <span className="pb-[8px] pl-[1px] text-gray-200">
                                            Volume Progress
                                        </span>
                                        <div className="w-full relative inline-block z-0">
                                            <span className="border-0 right-[-10px] bottom-[1px] top-auto left-auto border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                                background: "0_0"
                                            }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="m6 9 6 6 6-6"/>
                                                </svg>
                                            </span>
                                            <span className="border-0 right-[-10px] top-[1px] border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                                background: "0_0"
                                            }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="m18 15-6-6-6 6"/>
                                                </svg>
                                            </span>
                                            <div className="w-full bg-background-dark rounded-md relative z-10">
                                                <input type="text" id="progressVolumes" className="pl-[15px] pr-[50px] text-left w-full bg-background-dark border-0 outline-none inline-block h-[40px] p-[0_15px] text-white rounded-md" defaultValue={listData.progressVolumes} />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                <div className="grid-in-start lg:mb-0 mb-[25px] z-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">
                                        Start Date
                                    </span>
                                    <div className="w-full relative inline-block z-0">
                                        <div className="w-full bg-background-dark rounded-md relative z-10">
                                            <input type="text" id="startDate" className="pl-[15px] pr-[50px] text-left w-full bg-background-dark border-0 outline-none inline-block h-[40px] p-[0_15px] text-white rounded-md" defaultValue={listData.startedAt ? `${String(listData.startedAt?.getMonth())}/${String(listData.startedAt?.getDay())}/${String(listData.startedAt?.getFullYear())}` : ""} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-in-finish lg:mb-0 mb-[25px] z-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">
                                        Finish Date
                                    </span>
                                    <div className="w-full relative inline-block z-0">
                                        <div className="w-full bg-background-dark rounded-md relative z-10">
                                            <input type="text" id="finishDate" className="pl-[15px] pr-[50px] text-left w-full bg-background-dark border-0 outline-none inline-block h-[40px] p-[0_15px] text-white rounded-md" defaultValue={listData.completedAt ? `${String(listData.completedAt?.getMonth())}/${String(listData.completedAt?.getDay())}/${String(listData.completedAt?.getFullYear())}` : ""} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-in-repeat lg:mb-0 mb-[25px] z-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">
                                        Repeats
                                    </span>
                                    <div className="w-full relative inline-block z-0">
                                        <span className="border-0 right-[-10px] bottom-[1px] top-auto left-auto border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                            background: "0_0"
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m6 9 6 6 6-6"/>
                                            </svg>
                                        </span>
                                        <span className="border-0 right-[-10px] top-[1px] border-r-0 border-l-[1px_solid_#dcdfe6] rounded-[0_0_4px_0] h-auto absolute w-[40px] z-20 text-center text-white" style={{
                                            background: "0_0"
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m18 15-6-6-6 6"/>
                                            </svg>
                                        </span>
                                        <div className="w-full bg-background-dark rounded-md relative z-10">
                                            <input type="text" id="repeats" className="pl-[15px] pr-[50px] text-left w-full bg-background-dark border-0 outline-none inline-block h-[40px] p-[0_15px] text-white rounded-md" defaultValue={listData.repeat} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-in-notes z-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">
                                        Notes
                                    </span>
                                    <div className="w-full bg-background-dark rounded-md inline-block text-gray-400 z-0">
                                        <textarea autoComplete="off" id="notes" className="border-none outline-none pt-[10px] px-2 w-full bg-background-dark" defaultValue={listData.notes}></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export const getServerSideProps = async ({ query }: { query: { id: string } }) => {
    const { id } = query;
    
    const media = await (await axios.get(`${env.BACKEND_URL}/info?id=${id}&apikey=${env.API_KEY}`)).data as Anime | Manga;
    const relations = await (await axios.get(`${env.BACKEND_URL}/relations?id=${id}&apikey=${env.API_KEY}`)).data as Anime | Manga;

    const contentType = media.type === Type.ANIME ? "episodes" : "chapters";
    const content = await (await axios.get(`${env.BACKEND_URL}/${contentType}?id=${id}&apikey=${env.API_KEY}`)).data as EpisodeData[] | ChapterData[];

    if (media.type === Type.ANIME) {
        const episodeCovers = await (await axios.get(`${env.BACKEND_URL}/episode-covers?id=${id}&apikey=${env.API_KEY}`)).data as { episode: number, img: string }[];

        for (let i = 0; i < content.length; i++) {
            const episodes = (content as EpisodeData[])[i]?.episodes ?? [];
            for (let j = 0; j < episodes.length; j++) {
                const episodeNumber = (episodes[j]?.number ?? 0);
                for (let k = 0; k < episodeCovers.length; k++) {
                    if (episodeCovers[k]?.episode === episodeNumber) {
                        if (!episodes[j]?.img) {
                            Object.assign((content as EpisodeData[])[i]?.episodes[j] ?? {}, { img: episodeCovers[k]?.img });
                        }
                        break;
                    }
                }
            }
        }

        return {
            props: {
                media,
                relations,
                content
            },
        };
    } else {
        return {
            props: {
                media,
                relations,
                content
            },
        };
    }
};

export default Info;

interface Props {
    media: Anime | Manga;
    relations: AnimeRelation[] | MangaRelation[];
    content: EpisodeData[] | ChapterData[];
}