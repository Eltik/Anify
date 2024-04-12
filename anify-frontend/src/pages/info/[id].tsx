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
import { type Anime, type Manga, type EpisodeData, type ChapterData, Type, Season, Format, type AnimeRelation, type MangaRelation, type UserData, type UserTokens, type Entry, type Episode } from "~/types";

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

    const userData = useStore(useUserData, (state: any) => state.userData as UserData);
    const userTokens = useStore(useTokens, (state: any) => state.tokens as UserTokens[]);
    const preferredList = useStore(usePreferredList, (state: any) => state.preferredList as string);

    const providerSelector = content.map((provider, index) => {
        return {
            value: index,
            label: capitalize(provider.providerId),
        };
    });

    function updateProviderIndex(data: { value: number; label: string } | null) {
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

    const totalPages = Math.ceil(
        media.type === "ANIME"
            ? (content as EpisodeData[])[index]?.episodes.filter((episode) => {
                  if (subDub === "dub") {
                      return episode.hasDub;
                  } else {
                      return true;
                  }
              }).length ?? 0
            : ((content as ChapterData[])[index]?.chapters?.length ?? 0) / chaptersPerPage
    );

    const pagination = [];

    if (media.type != "ANIME") {
        for (let index = 0; index < totalPages; index++) {
            pagination.push(
                <button
                    key={index}
                    type="button"
                    className={`pointer relative flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center overflow-hidden rounded bg-background-light px-3 text-sm transition-all duration-150 ${index + 1 === currentPage ? "bg-main" : "hover:bg-background-light/80"}`}
                    onClick={() => {
                        handlePageChange(index + 1);
                    }}
                >
                    <span className="relative flex select-none items-center justify-center font-medium text-white">{index + 1}</span>
                </button>
            );
        }
    } else {
        const getPageNumbers = () => {
            const pageNumbers = [];
            for (let i = 1; i <= totalPages; i += chaptersPerPage) {
                pageNumbers.push(i);
            }
            return pageNumbers;
        };

        getPageNumbers().map((pageNumber, index: number) => {
            pagination.push(
                <button
                    key={index}
                    type="button"
                    className={`pointer relative flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center overflow-hidden rounded bg-background-light px-3 text-sm transition-all duration-150 ${index + 1 === currentPage ? "bg-main" : "hover:bg-background-light/80"}`}
                    onClick={() => {
                        handlePageChange(index + 1);
                    }}
                >
                    <span className="relative flex select-none items-center justify-center font-medium text-white">{index + 1}</span>
                </button>
            );
        });
    }

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleListRequest = async (): Promise<Entry | undefined> => {
        NProgress.start();

        if (!userData || !userTokens || !Array.isArray(userTokens)) {
            console.log("No user data or tokens");

            NProgress.done();
            return;
        }

        if (preferredList) {
            if (
                (userData as any)[preferredList + "Id"] &&
                userTokens?.find((token) => {
                    return token.id === preferredList;
                })?.accessToken
            ) {
                const data = (await (
                    await axios.post(`/api/fetchEntry`, {
                        provider: preferredList,
                        userId: (userData as any)[preferredList + "Id"],
                        accessToken: userTokens?.find((token) => {
                            return token.id === preferredList;
                        })?.accessToken,
                        mediaId:
                            preferredList === "anilist"
                                ? media.id
                                : media.mappings.find((data) => {
                                      return data.providerId === preferredList;
                                  })?.id ?? "",
                    })
                ).data) as Entry;

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
            label: media.type === "ANIME" ? "Currently Watching" : "Currently Reading",
        },
        {
            value: "PLANNING",
            label: media.type === "ANIME" ? "Plan to Watch" : "Plan to Read",
        },
        {
            value: "COMPLETED",
            label: "Completed",
        },
        {
            value: "PAUSED",
            label: "Paused",
        },
        {
            value: "DROPPED",
            label: "Dropped",
        },
        {
            value: "REPEATING",
            label: "Repeating",
        },
    ];

    const saveEntry = async () => {
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
            notes: listEntries.notes,
        });

        if (media.type === Type.MANGA) {
            Object.assign(listData, {
                progressVolumes: (listEntries as any).progressVolumes,
            });
        }

        if (preferredList === "anilist") {
            const token = userTokens?.find((token) => {
                return token.id === "anilist";
            })?.accessToken;
            const data = (await (
                await axios.post(`/api/saveEntry`, {
                    provider: "anilist",
                    userId: userData.anilistId,
                    accessToken: token,
                    entry: listData,
                })
            ).data) as Entry;

            NProgress.done();

            setShowList(false);
            return data;
        }
        if (preferredList === "mal") {
            const token = userTokens?.find((token) => {
                return token.id === "mal";
            })?.accessToken;
            const data = (await (
                await axios.post(`/api/saveEntry`, {
                    provider: "mal",
                    userId: userData.malId,
                    accessToken: token,
                    entry: listEntries,
                })
            ).data) as Entry;

            NProgress.done();

            setShowList(false);
            return data;
        }
        if (preferredList === "simkl") {
            const token = userTokens?.find((token) => {
                return token.id === "simkl";
            })?.accessToken;
            const data = (await (
                await axios.post(`/api/saveEntry`, {
                    provider: "simkl",
                    userId: userData.simklId,
                    accessToken: token,
                    entry: listEntries,
                })
            ).data) as Entry;

            NProgress.done();

            setShowList(false);
            return data;
        }
    };

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
                <meta property="og:image" content={"https://anify.tv/api/og?id=" + media.id} />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={"https://anify.tv/info/" + media.id} />
                <meta property="twitter:title" content={media.title.english ?? media.title.romaji ?? media.title.native ?? ""} />
                <meta property="twitter:description" content={media.description ?? ""} />
                <meta property="twitter:image" content={"https://anify.tv/api/og?id=" + media.id} />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Sidebar active={media.type === Type.ANIME ? "anime" : media.format === Format.NOVEL ? "novel" : "manga"} />
            <Navbar active={media.type === Type.ANIME ? "anime" : media.format === Format.NOVEL ? "novel" : "manga"} />
            <main className="pl-0 md:pl-14">
                <div className="mb-8 flex-grow">
                    <div>
                        <div className="grid grid-cols-[100px_auto] gap-[1rem] px-4 grid-areas-infoMobile lg:grid-cols-[1fr_200px_minmax(0,calc(1240px-3.5rem))_1fr] lg:grid-areas-info">
                            <div
                                className="absolute left-0 top-[var(--banner-overlap)] z-[0] h-[100%] w-full blur-xl"
                                style={{
                                    background: `radial-gradient(circle at top, rgba(25,26,28,.8), #191a1c 75%), no-repeat top 35% center / 100% url("${media.bannerImage ?? ""}")`,
                                }}
                            />
                            <div
                                className="absolute left-0 right-0 top-[var(--banner-top)] z-[1] block h-[calc(var(--banner-height)+var(--banner-overlap))] w-auto"
                                style={{
                                    clip: "rect(0,auto,auto,0)",
                                    clipPath: "inset(0 0)",
                                }}
                            >
                                <div
                                    className="fixed h-[calc(var(--banner-height)+var(--banner-overlap))] w-full bg-cover"
                                    style={{
                                        backgroundImage: `url("${media.bannerImage ?? ""}")`,
                                    }}
                                />
                                <div
                                    className="pointer-events-none absolute bottom-0 right-0 top-0 h-auto w-full shadow-2xl"
                                    style={{
                                        background: "linear-gradient(180deg,rgba(0,0,0,.4) 35.51%,rgba(0,0,0,.64))",
                                        backdropFilter: "blur(4px)",
                                        WebkitBackdropFilter: "blur(5px)",
                                    }}
                                />
                            </div>
                            <div className="z-10 mt-24 grid-in-art">
                                <Link href={media.coverImage ?? ""} className="group relative mb-auto flex select-none items-start" target="_blank">
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-white">
                                            <path fill="currentColor" d="m9.5 13.09 1.41 1.41-4.5 4.5H10v2H3v-7h2v3.59l4.5-4.5m1.41-3.59L9.5 10.91 5 6.41V10H3V3h7v2H6.41l4.5 4.5m3.59 3.59 4.5 4.5V14h2v7h-7v-2h3.59l-4.5-4.5 1.41-1.41M13.09 9.5l4.5-4.5H14V3h7v7h-2V6.41l-4.5 4.5-1.41-1.41Z"></path>
                                        </svg>
                                    </div>
                                    <img src={media.coverImage ?? ""} className="h-auto w-full rounded shadow-md" loading="lazy" alt={`${media.title.english ?? media.title.romaji ?? media.title.native ?? ""} Cover`} />
                                </Link>
                            </div>
                            <div className="relative z-10 mt-24 flex min-w-0 flex-col justify-end pb-[.5rem] pl-[.5rem] pr-[.5rem] grid-in-title lg:mb-[calc(var(--banner-height)/4)]">
                                <span
                                    className="mb-1 line-clamp-2 text-3xl font-bold text-white"
                                    style={{
                                        textShadow: "rgba(0, 0, 0, 0.3) 1px 2px 4px",
                                    }}
                                >
                                    {media.title.english ?? media.title.romaji ?? media.title.native}
                                </span>
                                <span className="line-clamp-2 text-base font-normal leading-5 text-white sm:text-xl lg:inline-block">{media.title.romaji}</span>
                                <span className="line-clamp-2 hidden flex-grow text-white sm:block">{media.title.native}</span>
                            </div>
                            <div className="relative z-10 grid-in-buttons sm:ml-2">
                                <div className="mb-2 flex flex-wrap gap-2 sm:mb-0">
                                    <Link href={`${media.type === Type.ANIME ? `/watch/${media.id}/${content[index]?.providerId ?? ""}/${encodeURIComponent((content[index] as EpisodeData)?.episodes[0]?.id ?? "")}/${subDub}` : `/read/${media.id}/${content[index]?.providerId ?? ""}/${encodeURIComponent((content[index] as ChapterData)?.chapters[(content[index] as ChapterData)?.chapters?.length - 1]?.id ?? "")}`}`} className="relative flex items-center justify-center font-medium">
                                        <button
                                            type="button"
                                            className="pointer relative flex min-h-[3rem] min-w-[13.75rem] flex-grow-0 items-center justify-center overflow-hidden whitespace-nowrap rounded bg-main px-3 text-white transition-all duration-150 hover:bg-main-dark sm:px-3"
                                            style={{
                                                boxShadow: "0 0 24px -8px rgb(76, 184, 117)",
                                            }}
                                        >
                                            {media.type === "ANIME" ? "Watch Now" : "Read Now"}
                                        </button>
                                    </Link>
                                    <div className="z-1 relative">
                                        <div>
                                            <button
                                                type="button"
                                                className="md-btn accent pointer relative flex min-h-[3rem] min-w-[3rem] items-center justify-center overflow-hidden rounded bg-background-light !px-0 transition-all duration-150 hover:bg-background-light"
                                                onClick={() => {
                                                    if (listData.listId) setShowList(true);
                                                    else {
                                                        void handleListRequest().then((data) => {
                                                            if (!data) return;
                                                            setListData(data ?? ({} as Entry));
                                                            setShowList(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <span className="relative flex select-none items-center justify-center font-medium text-white">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="inline-flex h-[1.5rem] w-[1.5rem] flex-shrink-0 items-center justify-center">
                                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path>
                                                    </svg>
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="z-20 mt-auto grid-in-stats sm:mx-2 sm:mt-0">
                                <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                                    <span className="text-primary group relative flex cursor-pointer items-center text-main">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="mr-1" viewBox="0 0 24 24">
                                            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                        </svg>
                                        {media.averageRating}
                                        <div
                                            className="pointer-events-none absolute top-8 transform-none rounded-md bg-background-light p-3 opacity-0 transition-all duration-150 group-hover:scale-105 group-hover:opacity-100"
                                            style={{
                                                boxShadow: "0 1px 12px #000a",
                                            }}
                                        >
                                            <div className="flex flex-row gap-5">
                                                {media.rating?.anilist && media.rating.anilist != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">AniList</span>
                                                        <span className="text-sm text-gray-300">{media.rating.anilist}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.mal && media.rating.mal != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">MAL</span>
                                                        <span className="text-sm text-gray-300">{media.rating.mal}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.kitsu && media.rating.kitsu != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">Kitsu</span>
                                                        <span className="text-sm text-gray-300">{media.rating.kitsu}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.anidb && media.rating.anidb != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">AniDB</span>
                                                        <span className="text-sm text-gray-300">{media.rating.anidb}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.comick && media.rating.comick != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">ComicK</span>
                                                        <span className="text-sm text-gray-300">{media.rating.comick}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.mangadex && media.rating.mangadex != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">MangaDex</span>
                                                        <span className="text-sm text-gray-300">{media.rating.mangadex}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.tmdb && media.rating.tmdb != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">TMDB</span>
                                                        <span className="text-sm text-gray-300">{media.rating.tmdb}</span>
                                                    </div>
                                                ) : null}
                                                {media.rating?.tvdb && media.rating.tvdb != 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-base text-white">TVDB</span>
                                                        <span className="text-sm text-gray-300">{media.rating.tvdb}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </span>
                                    <span className="group relative flex cursor-pointer items-center text-zinc-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="mr-1">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"></path>
                                        </svg>
                                        {formatCompactNumber(Math.round(media.averagePopularity))}
                                    </span>
                                </div>
                            </div>
                            <div className="z-10 grid-in-info sm:mx-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div
                                        className="flex flex-wrap gap-2"
                                        style={{
                                            maxHeight: "calc(2em + 0.25rem)",
                                        }}
                                    >
                                        {media.genres.slice(0, 7).map((genre, index: number) => {
                                            return (
                                                <span key={index} className="mb-auto mt-auto inline-block rounded-sm bg-zinc-700 p-[0_0.375rem] text-xs capitalize text-white">
                                                    {genre.toUpperCase()}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    {media.type === Type.ANIME && (media as Anime).season ? (
                                        <span className="mb-[-.3125rem] mt-[-.3125rem] inline-flex items-center gap-2 p-0 text-main-text">
                                            {(media as Anime).season === Season.WINTER ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <line x1="2" x2="22" y1="12" y2="12" />
                                                    <line x1="12" x2="12" y1="2" y2="22" />
                                                    <path d="m20 16-4-4 4-4" />
                                                    <path d="m4 8 4 4-4 4" />
                                                    <path d="m16 4-4 4-4-4" />
                                                    <path d="m8 20 4-4 4 4" />
                                                </svg>
                                            ) : (media as Anime).season === Season.SPRING ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                                                    <path d="M16 14v6" />
                                                    <path d="M8 14v6" />
                                                    <path d="M12 16v6" />
                                                </svg>
                                            ) : (media as Anime).season === Season.SUMMER ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <circle cx="12" cy="12" r="4" />
                                                    <path d="M12 2v2" />
                                                    <path d="M12 20v2" />
                                                    <path d="m4.93 4.93 1.41 1.41" />
                                                    <path d="m17.66 17.66 1.41 1.41" />
                                                    <path d="M2 12h2" />
                                                    <path d="M20 12h2" />
                                                    <path d="m6.34 17.66-1.41 1.41" />
                                                    <path d="m19.07 4.93-1.41 1.41" />
                                                </svg>
                                            ) : (media as Anime).season === Season.FALL ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                                                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                                                </svg>
                                            ) : (
                                                ""
                                            )}
                                            <span className="text-white">
                                                {capitalize((media as Anime).season)} {media.year ?? "?"}
                                            </span>
                                        </span>
                                    ) : (
                                        ""
                                    )}
                                </div>
                            </div>
                            <div
                                className="z-10 min-w-0 cursor-pointer rounded-md bg-gray-300/5 p-2 text-white transition-all duration-150 ease-in-out grid-in-synopsis hover:bg-gray-200/10"
                                onClick={() => {
                                    setShowDescription(!showDescription);
                                }}
                            >
                                <div className={`break-words ${!showDescription ? "line-clamp-3" : "line-clamp-none"} text-sm transition-all duration-200 lg:text-base`}>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: media.description ?? "",
                                        }}
                                    ></div>
                                </div>
                                {!showDescription ? (
                                    <div className="mt-2 flex items-center gap-1">
                                        <span className="text-gray-100/50">Show more</span>
                                    </div>
                                ) : (
                                    <div className="mt-2 flex items-center gap-1">
                                        <span className="text-gray-100/50">Show less</span>
                                    </div>
                                )}
                            </div>
                            <div className="z-10 min-w-0 grid-in-content">
                                <div className="mb-4 mt-2 overflow-x-auto">{/* Select tabs? */}</div>
                                <div className="flex flex-col-reverse items-start gap-6 lg:flex-row">
                                    <div
                                        className="flex min-w-[25%] flex-wrap gap-x-4 gap-y-2 sm:max-w-[400px]"
                                        style={{
                                            flexBasis: "30%",
                                        }}
                                    >
                                        {media.status ? (
                                            <div className="mb-2">
                                                <span className="mb-2 font-bold text-white">Status</span>
                                                <div className="mt-2 flex flex-wrap gap-2 text-white">
                                                    <span className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                        <span>{capitalize(media.status)}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                        {(media as Anime).trailer ? (
                                            <div className="mb-2">
                                                <span className="mb-2 font-bold text-white">Trailer</span>
                                                <div className="mt-2 flex flex-wrap gap-2 text-white">
                                                    <span className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                        <a href={(media as Anime).trailer ?? "#"} target="_blank">
                                                            Link
                                                        </a>
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                        {media.countryOfOrigin ? (
                                            <div className="mb-2">
                                                <span className="mb-2 font-bold text-white">Country</span>
                                                <div className="mt-2 flex flex-wrap gap-2 text-white">
                                                    <span className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                        <span>{media.countryOfOrigin}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                        <div className="mb-2">
                                            <span className="mb-2 font-bold text-white">Genres</span>
                                            <div className="mt-2 flex flex-wrap gap-2 text-white">
                                                {media.genres.map((genre, index: number) => {
                                                    return (
                                                        <span key={index} className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                            <span>{genre}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <span className="mb-2 font-bold text-white">Track</span>
                                            <div className="mt-2 flex flex-wrap gap-2 text-white">
                                                {media.mappings.find((data) => {
                                                    return data.providerId === "anilist";
                                                })?.id ? (
                                                    <a
                                                        className="inline-flex min-h-[1.75rem] cursor-pointer items-center gap-2 rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80"
                                                        href={`https://anilist.co/${media.type?.toLowerCase()}/${
                                                            media.mappings.find((data) => {
                                                                return data.providerId === "anilist";
                                                            })?.id ?? ""
                                                        }`}
                                                        target="_blank"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 4.233 4.233" className="">
                                                            <path fill="#19212d" d="M.794 0H3.44c.44 0 .793.354.793.794V3.44c0 .44-.354.793-.793.793H.794A.792.792 0 0 1 0 3.44V.794C0 .354.354 0 .794 0z"></path>
                                                            <path fill="#0af" d="M2.247.794c-.104 0-.16.057-.16.16v.155l.815 2.33h.807c.104 0 .162-.056.162-.16v-.354c0-.104-.058-.161-.162-.161h-.947V.954c0-.103-.057-.16-.161-.16z"></path>
                                                            <path fill="#fff" d="M1.293.794.363 3.44h.722l.158-.458h.786l.154.458h.719L1.976.794zm.114 1.602.225-.733.247.733z"></path>
                                                        </svg>
                                                        <span>AniList</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => {
                                                    return data.providerId === "mal";
                                                })?.id ? (
                                                    <a
                                                        className="inline-flex min-h-[1.75rem] cursor-pointer items-center gap-2 rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80"
                                                        href={`https://myanimelist.net/${media.type?.toLowerCase()}/${
                                                            media.mappings.find((data) => {
                                                                return data.providerId === "mal";
                                                            })?.id ?? ""
                                                        }`}
                                                        target="_blank"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 4.233 4.233" className="">
                                                            <path fill="#2e51a2" d="M.794 0H3.44c.44 0 .793.354.793.794V3.44c0 .44-.354.793-.793.793H.794A.792.792 0 0 1 0 3.44V.794C0 .354.354 0 .794 0z"></path>
                                                            <path fill="#fff" d="M1.935 2.997a1.459 1.459 0 0 1-.149-.378 1.074 1.074 0 0 1-.032-.317.99.99 0 0 1 .037-.325c.077-.286.267-.479.53-.538.085-.019.155-.023.345-.023h.17l.083.295-.461.004-.042.014a.385.385 0 0 0-.225.195.582.582 0 0 0-.048.126c.128.01.212.006.36.006v-.297h.376v1.059h-.381v-.466h-.212c-.206 0-.212 0-.212.01a1.274 1.274 0 0 0 .152.458c-.007.008-.266.195-.27.197-.004.001-.013-.008-.02-.02zM.265 1.416H.6l.3.428.303-.428h.336v1.402H1.2l-.002-.85-.302.378-.291-.383-.003.855H.265zm2.9.005h.333v1.095l.47.003-.073.291-.73.003z"></path>
                                                        </svg>
                                                        <span>MyAnimeList</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => {
                                                    return data.providerId === "kitsu";
                                                })?.id ? (
                                                    <a
                                                        className="inline-flex min-h-[1.75rem] cursor-pointer items-center gap-2 rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80"
                                                        href={`https://kitsu.io/${media.type?.toLowerCase()}/${
                                                            media.mappings.find((data) => {
                                                                return data.providerId === "kitsu";
                                                            })?.id ?? ""
                                                        }`}
                                                        target="_blank"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 4.233 4.233" className="">
                                                            <path fill="#493c47" d="M.794 0H3.44c.44 0 .793.354.793.794V3.44c0 .44-.354.793-.793.793H.794A.792.792 0 0 1 0 3.44V.794C0 .354.354 0 .794 0z"></path>
                                                            <path fill="#e75e45" d="M1.551.266a.107.107 0 0 0-.079.018c-.008.005-.013.011-.02.018L1.44.32a.732.732 0 0 0-.121.527 1.284 1.284 0 0 0-.12.071c-.007.005-.065.045-.11.087A.74.74 0 0 0 .554.928L.532.933C.524.937.515.94.509.945a.109.109 0 0 0-.03.148v.003l.006.008c.088.12.188.225.296.318l.003.003c.07.06.203.146.3.181 0 0 .6.231.63.245.012.004.03.01.037.01a.106.106 0 0 0 .125-.084.274.274 0 0 0 .003-.038V1.06a1.211 1.211 0 0 0-.061-.345L1.816.71a1.836 1.836 0 0 0-.19-.39L1.623.31 1.62.308a.106.106 0 0 0-.069-.042zM1.533.43c.057.095.105.193.143.296a1.314 1.314 0 0 0-.224.06.605.605 0 0 1 .081-.356zm1.102.558a1.17 1.17 0 0 0-.588.126c-.01.005-.022.01-.033.017v.605c0 .008 0 .04-.005.066a.238.238 0 0 1-.246.193.399.399 0 0 1-.095-.021l-.525-.204a1.429 1.429 0 0 0-.05-.02 4.781 4.781 0 0 0-.59.592l-.011.013a.108.108 0 0 0 0 .123.11.11 0 0 0 .083.047.105.105 0 0 0 .065-.018 3.096 3.096 0 0 1 .668-.364.11.11 0 0 1 .127.02c.037.038.039.1.007.14l-.036.06a3.13 3.13 0 0 0-.304.665l-.005.019v.001a.1.1 0 0 0 .016.084.11.11 0 0 0 .085.046.101.101 0 0 0 .064-.019.144.144 0 0 0 .024-.021c.001-.004.005-.007.006-.01a2.93 2.93 0 0 1 .273-.332 3.11 3.11 0 0 1 1.666-.929c.005-.002.01-.001.015-.001a.067.067 0 0 1 .063.07.065.065 0 0 1-.052.06c-.603.129-1.69.845-1.31 1.885a.318.318 0 0 0 .02.041.11.11 0 0 0 .083.047c.018 0 .07-.005.102-.062.061-.116.177-.246.513-.385.935-.387 1.09-.94 1.106-1.291v-.02A1.19 1.19 0 0 0 2.635.988zm-1.92.06a.592.592 0 0 1 .268.06 1.164 1.164 0 0 0-.138.188 1.803 1.803 0 0 1-.224-.24.602.602 0 0 1 .094-.009zm1.367 2.01c.194.314.533.34.533.34-.347.145-.484.288-.557.404a1.016 1.016 0 0 1 .024-.744z"></path>
                                                        </svg>
                                                        <span>Kitsu</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => {
                                                    return data.providerId === "comick";
                                                })?.id ? (
                                                    <a
                                                        className="inline-flex min-h-[1.75rem] cursor-pointer items-center gap-2 rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80"
                                                        href={`https://comick.app/comic/${
                                                            media.mappings.find((data) => {
                                                                return data.providerId === "comick";
                                                            })?.id ?? ""
                                                        }`}
                                                        target="_blank"
                                                    >
                                                        <svg id="Layer_1" data-name="Layer 1" width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64">
                                                            <image width="64" height="64" xlinkHref="data:image/png;base64,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" />
                                                        </svg>
                                                        <span>ComicK</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => {
                                                    return data.providerId === "mangadex";
                                                })?.id ? (
                                                    <a
                                                        className="inline-flex min-h-[1.75rem] cursor-pointer items-center gap-2 rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80"
                                                        href={`https://mangadex.org/title/${
                                                            media.mappings.find((data) => {
                                                                return data.providerId === "mangadex";
                                                            })?.id ?? ""
                                                        }`}
                                                        target="_blank"
                                                    >
                                                        <svg id="Layer_1" data-name="Layer 1" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36.25 30.92">
                                                            <path
                                                                d="m32.54,19.67H6.22c-.32,0-.59-.26-.59-.59s.26-.58.59-.58h26.33c.32,0,.58.26.58.58s-.26.59-.58.59Zm0,2.22H6.22c-.32,0-.59-.26-.59-.58s.26-.59.59-.59h26.33c.32,0,.58.26.58.59s-.26.58-.58.58Z"
                                                                style={{
                                                                    fill: "#ff6740",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m28.23,21.23v3.91l1.67-.97,1.68.97v-3.91h-3.35Z"
                                                                style={{
                                                                    fill: "#ff6740",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m33.72,8.87h-4.4v2.44h4.4v-2.44h0Z"
                                                                style={{
                                                                    fill: "#272b30",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m36.08,11.93s-.04-.04-.06-.06c-.5-.44-.93-.96-1.27-1.54v-.02h0c-.38-.66-.62-1.39-.72-2.15,0-.05,0-.09-.01-.14h0c-.04-.28-.16-.53-.33-.73l-.05-.05c-1.4-1.58-3.25-2.69-5.3-3.2-.06-1.21.22-2.42.81-3.48.1-.18.03-.41-.15-.51-.06-.03-.12-.05-.18-.05h-.03c-2.59.42-5.01,1.58-6.97,3.33-1.14,1.02-2.1,2.22-2.85,3.56-.55-.3-1.13-.55-1.72-.76-1.77-.63-3.66-.87-5.54-.7-1.44.13-2.85.5-4.16,1.11C3.38,8.44.4,12.49.04,17.27c-.03.33-.04.67-.04,1v3.23c0,.56.08,1.1.24,1.6.42,1.37,1.35,2.53,2.6,3.23.76.43,1.63.68,2.56.7h8.21c.08,0,.16,0,.24,0,.01,0,.03,0,.04,0,.02,0,.04,0,.06,0,.89.1,1.6.81,1.71,1.7.01.08.02.15.01.23v.04s0,0,0,0c.02.66.36,1.26.92,1.61.91.56,2.11.28,2.67-.63.17-.27.26-.57.28-.88,0-.03,0-.05,0-.08v-.11c0-.66-.11-1.3-.31-1.89-.29-.85-.78-1.62-1.42-2.25-1.09-1.07-2.56-1.68-4.09-1.68h-6.85s-.03,0-.05,0c-.02,0-.03,0-.05,0-1.59-.03-2.87-1.32-2.87-2.92,0-1.61,1.31-2.92,2.92-2.92h26.11c.66,0,1.24-.42,1.44-1.05l.02-.07c.09-.29.27-.55.51-.74h0s.04-.03.06-.05c.03-.02.05-.04.08-.06,1.05-.78,1.47-2.15,1.03-3.39h0Zm-3.49-1.16c-.06,0-.12-.02-.17-.04-.43-.25-.94-.33-1.42-.23-.21.04-.41.11-.6.22h0s-.02.02-.03.02c-.19.08-.4,0-.49-.18-.07-.16-.02-.35.12-.45l.04-.02c.85-.48,1.89-.48,2.74,0l.04.02c.17.11.22.34.1.51-.07.1-.18.16-.31.16Z"
                                                                style={{
                                                                    fill: "#f1f1f1",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m36.08,11.93s-.04-.04-.06-.06c-.5-.44-.93-.96-1.27-1.54v-.02h0c-.38-.66-.62-1.39-.72-2.15,0-.05,0-.09-.01-.14h0c-.04-.28-.16-.53-.33-.73l-.05-.05c-1.4-1.58-3.25-2.69-5.3-3.2-.06-1.21.22-2.42.81-3.48.1-.18.03-.41-.15-.51-.06-.03-.12-.05-.18-.05h-.03c-2.59.42-5.01,1.58-6.97,3.33-1.14,1.02-2.1,2.22-2.85,3.56-.55-.3-1.13-.55-1.72-.76-1.77-.63-3.66-.87-5.54-.7-1.44.13-2.85.5-4.16,1.11C3.38,8.44.4,12.49.04,17.27c-.03.33-.04.67-.04,1v3.23c0,.56.08,1.1.24,1.6.42,1.37,1.35,2.53,2.6,3.23.76.43,1.63.68,2.56.7h8.21c.08,0,.16,0,.24,0,.01,0,.03,0,.04,0,.02,0,.04,0,.06,0,.89.1,1.6.81,1.71,1.7.01.08.02.15.01.23v.04s0,0,0,0c.02.66.36,1.26.92,1.61.91.56,2.11.28,2.67-.63.17-.27.26-.57.28-.88,0-.03,0-.05,0-.08v-.11c0-.66-.11-1.3-.31-1.89-.29-.85-.78-1.62-1.42-2.25-1.09-1.07-2.56-1.68-4.09-1.68h-6.85s-.03,0-.05,0c-.02,0-.03,0-.05,0-1.59-.03-2.87-1.32-2.87-2.92,0-1.61,1.31-2.92,2.92-2.92h26.11c.66,0,1.24-.42,1.44-1.05l.02-.07c.09-.29.27-.55.51-.74h0s.04-.03.06-.05c.03-.02.05-.04.08-.06,1.05-.78,1.47-2.15,1.03-3.39h0Zm-3.49-1.16c-.06,0-.12-.02-.17-.04-.43-.25-.94-.33-1.42-.23-.21.04-.41.11-.6.22h0s-.02.02-.03.02c-.19.08-.4,0-.49-.18-.07-.16-.02-.35.12-.45l.04-.02c.85-.48,1.89-.48,2.74,0l.04.02c.17.11.22.34.1.51-.07.1-.18.16-.31.16Z"
                                                                style={{
                                                                    fill: "#e6e6e6",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m19,6.82c.7,3.38,3.64,5.91,7.15,5.91,2.07,0,3.93-.88,5.26-2.29h-.02c-.14,0-.27.01-.4.04-.21.04-.41.11-.6.21h0s-.02.02-.03.02c-.18.09-.4.01-.49-.17-.02-.05-.04-.11-.04-.16,0-.13.06-.24.16-.31l.04-.02c.59-.33,1.29-.44,1.95-.29.64-.86,1.08-1.85,1.31-2.9-1.36-1.39-3.07-2.37-4.96-2.83-.06-1.21.22-2.42.81-3.48.1-.18.03-.41-.15-.51-.06-.03-.12-.05-.18-.05C28.8,0,28.79,0,28.78,0c-2.59.42-5.01,1.58-6.97,3.33-1.12,1-2.07,2.18-2.81,3.49h0Z"
                                                                style={{
                                                                    fill: "#ff6740",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m34.15,13.81c-.32-.1-.63-.18-.96-.26-.95-.24-1.93-.39-2.91-.46-.65-.05-1.31-.03-1.96.02l-.49.05c-.16.02-.32.06-.48.09-.33.04-.64.16-.96.23.61-.28,1.25-.47,1.91-.57.66-.1,1.33-.13,2-.08.67.05,1.33.15,1.97.31.65.16,1.27.38,1.87.67Zm-.29.6c-.33-.05-.65-.09-.98-.11-.98-.09-1.96-.1-2.94-.02-.65.04-1.3.17-1.93.31l-.48.13c-.16.05-.31.11-.46.16-.32.09-.6.25-.92.37.56-.37,1.16-.65,1.8-.85.64-.2,1.3-.33,1.96-.38.66-.05,1.34-.05,2,.02.66.06,1.32.19,1.95.38Zm-.04.7c-.33.03-.66.05-.99.1-.98.12-1.94.33-2.88.61-.63.18-1.23.44-1.82.72l-.43.23c-.14.08-.28.17-.42.26-.29.16-.54.38-.82.56.47-.48,1-.89,1.58-1.22.58-.33,1.2-.6,1.84-.79.64-.2,1.29-.34,1.95-.42.66-.08,1.33-.1,1.99-.05Z"
                                                                style={{
                                                                    fill: "#272b30",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m36.01,11.87c-.11-.1-.22-.2-.32-.3-.46.28-.6.87-.33,1.33.18.29.49.47.83.47h.01s.02-.08.02-.12c.05-.45,0-.9-.15-1.32l-.06-.06Z"
                                                                style={{
                                                                    fill: "#f27baa",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m27.99,4.54s0,.09,0,.14c-1.17.47-2.24,1.16-3.17,2.02-.42-2.9,1.48-5.62,4.34-6.23-.77,1.22-1.18,2.63-1.18,4.07h0Z"
                                                                style={{
                                                                    fill: "#fff",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                            <path
                                                                d="m17.81,24.79c-.13-.13-.26-.25-.4-.36-1.45.3-2.67,1.29-3.24,2.66.88.2,1.51.99,1.51,1.89v.04s0,0,0,0c.02.66.36,1.26.92,1.61.91.56,2.11.28,2.67-.63.18-.29.28-.62.29-.96v-.11c0-.66-.11-1.3-.31-1.89-.29-.85-.78-1.62-1.42-2.26h0Z"
                                                                style={{
                                                                    fill: "#ff6740",
                                                                    strokeWidth: "0px",
                                                                }}
                                                            />
                                                        </svg>
                                                        <span>MangaDex</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => {
                                                    return data.providerId === "tvdb";
                                                })?.id ? (
                                                    <a className="inline-flex min-h-[1.75rem] cursor-pointer items-center gap-2 rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80" href={`#`}>
                                                        <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99.57 54" width="32" height="16">
                                                            <g id="Logo-tvdb">
                                                                <path
                                                                    id="Combined-Shape"
                                                                    d="m0,5.1C0,1.81,2.96-.44,6.46.07h0l45.64,5.96c2.05.3,3.69,2.51,3.69,4.92h0v6.23c-3.85,2.58-6.37,6.89-6.37,11.78s2.46,9.21,6.37,11.78h0v2.74c0,2.41-1.63,4.62-3.69,4.92h0l-40.5,5.53c-3.5.52-6.46-1.74-6.46-5.02h0L0,5.1Zm19.68,5.73h-6.02v7.88h-3.82v4.56h3.82v8.76c-.18,5.5,1.99,7.97,6.95,8.02h4.64s0-4.56,0-4.56h-2.38c-2.7-.13-3.28-.92-3.19-4.47v-7.75h7.4l6.85,16.78h6.47l9.43-21.33h-6.38l-6.11,14.67-5.57-14.67h-12.1v-7.88Z"
                                                                    style={{
                                                                        fill: "#6cd591",
                                                                        strokeWidth: "0px",
                                                                    }}
                                                                />
                                                                <path
                                                                    id="Shape"
                                                                    d="m88.61,18.28c3.91,0,6.51.96,8.49,3.15,1.62,1.75,2.47,4.34,2.47,7.23,0,4.2-1.71,7.49-4.81,9.37-2.02,1.23-3.77,1.58-7.73,1.58h-9.79V10.39h6.02v7.88h5.35Zm-5.35,16.78h4.45c3.55,0,5.71-2.37,5.71-6.22s-1.89-6-5.71-6h-4.45v12.22Z"
                                                                    style={{
                                                                        fill: "#fff",
                                                                        strokeWidth: "0px",
                                                                    }}
                                                                />
                                                                <path
                                                                    id="Shape-2"
                                                                    data-name="Shape"
                                                                    d="m68.01,10.39h6.02v29.22h-10.38c-4.22,0-6.24-.61-8.4-2.5-2.2-1.97-3.32-4.77-3.32-8.32s1.21-6.48,3.77-8.54c1.62-1.31,3.82-1.97,6.65-1.97h5.66v-7.88h0Zm0,12.44h-4.36c-3.5,0-5.62,2.23-5.62,5.96s2.16,6.26,5.62,6.26h4.36v-12.22Z"
                                                                    style={{
                                                                        fill: "#fff",
                                                                        strokeWidth: "0px",
                                                                    }}
                                                                />
                                                            </g>
                                                        </svg>
                                                        <span>TVDB</span>
                                                    </a>
                                                ) : null}
                                                {media.mappings.find((data) => {
                                                    return data.providerId === "tmdb";
                                                })?.id ? (
                                                    <a
                                                        className="inline-flex min-h-[1.75rem] cursor-pointer items-center gap-2 rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80"
                                                        href={`https://themoviedb.org${
                                                            media.mappings.find((data) => {
                                                                return data.providerId === "tmdb";
                                                            })?.id ?? ""
                                                        }`}
                                                        target="_blank"
                                                    >
                                                        <span>TMDB</span>
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        {media.synonyms.length > 0 ? (
                                            <div className="mb-2">
                                                <span className="mb-2 font-bold text-white">Alternate Titles</span>
                                                <div className="mt-2 flex flex-wrap gap-2 text-white">
                                                    {media.title.english ? (
                                                        <span className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                            <span>{media.title.english}</span>
                                                        </span>
                                                    ) : null}
                                                    {media.title.romaji ? (
                                                        <span className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                            <span>{media.title.romaji}</span>
                                                        </span>
                                                    ) : null}
                                                    {media.title.native ? (
                                                        <span className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                            <span>{media.title.native}</span>
                                                        </span>
                                                    ) : null}
                                                    {media.synonyms.map((synonym, index: number) => {
                                                        return (
                                                            <span key={index} className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                                <span>{synonym}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                        {media.tags.length > 0 ? (
                                            <div className="mb-2">
                                                <span className="mb-2 font-bold text-white">Tags</span>
                                                <div className="mt-2 flex flex-wrap gap-2 text-white">
                                                    {media.tags.map((tag, index: number) => {
                                                        return (
                                                            <span key={index} className="inline-flex min-h-[1.75rem] cursor-pointer items-center rounded-sm bg-background-light p-[.3125rem_.5rem] text-sm transition-all duration-200 ease-in-out hover:bg-main/80">
                                                                <span>{tag}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="w-full flex-grow">
                                        <div className="relative mb-4 w-full sm:max-w-[30%]">
                                            <input
                                                id="search"
                                                type="text"
                                                className="block w-full rounded-lg border-2 border-zinc-600 bg-gray-50/20 px-4 py-2 pl-10 text-sm leading-5 text-white placeholder-gray-300 transition duration-150 focus:border-main focus:placeholder-gray-100 focus:outline-none focus:ring-1 focus:ring-main focus:ring-opacity-50"
                                                placeholder="Search..."
                                                onChange={() => {
                                                    setCurrentSearch((document.getElementById("search") as HTMLInputElement).value);
                                                }}
                                            />
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <svg className="h-5 w-5 fill-current text-gray-50" aria-hidden="true" viewBox="0 0 512 512">
                                                    <path fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z"></path>
                                                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" d="M338.29 338.29L448 448"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        {media.type === "ANIME" ? (
                                            <div className="mb-2 flex flex-row items-center gap-3">
                                                <span className="font-medium text-white">{subDub === "sub" ? "Subbed" : "Dubbed"}</span>
                                                <div
                                                    className={`toggle  ${subDub === "sub" ? "active" : ""}`}
                                                    id="subDub"
                                                    onClick={() => {
                                                        setSubDub(subDub === "sub" ? "dub" : "sub");
                                                    }}
                                                ></div>
                                            </div>
                                        ) : null}
                                        <Select
                                            options={providerSelector}
                                            classNames={{
                                                control: (state) => (state.isFocused ? "border-main-300" : "border-none"),
                                            }}
                                            styles={{
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
                                                    border: "none",
                                                }),
                                                input: (baseStyles) => ({
                                                    ...baseStyles,
                                                    color: "white",
                                                    backgroundColor: "#333333",
                                                    border: "none",
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
                                                    color: "white",
                                                }),
                                                option: (baseStyles) => ({
                                                    ...baseStyles,
                                                    backgroundColor: "#1f1f1f",
                                                    color: "white",
                                                    transition: "0.1s all",
                                                    cursor: "pointer",
                                                    ":hover": {
                                                        backgroundColor: "#1f1f1f",
                                                    },
                                                    ":active": {
                                                        color: "white",
                                                        backgroundColor: "#1f1f1f",
                                                    },
                                                    lineHeight: "1.25rem",
                                                    height: "100%",
                                                }),
                                                indicatorSeparator: (baseStyles) => ({
                                                    ...baseStyles,
                                                    display: "none",
                                                }),
                                                dropdownIndicator: (baseStyles) => ({
                                                    ...baseStyles,
                                                    backgroundColor: "rgb(var(--blue-300));",
                                                    color: "white",
                                                    transition: "0.1s all",
                                                    ":hover": {
                                                        color: "rgba(255, 255, 255, 0.7)",
                                                    },
                                                    ":active": {
                                                        color: "rgba(255, 255, 255, 0.5)",
                                                    },
                                                }),
                                            }}
                                            defaultValue={providerSelector[0]}
                                            isSearchable={false}
                                            name="chapter_list"
                                            onChange={updateProviderIndex}
                                        />
                                        <br className="lg:hidden" />
                                        {/* Pagination Buttons */}
                                        {pagination.length > 1 ? (
                                            <div className="mb-3 mt-3">
                                                <div className="flex justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        className="pointer relative flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center overflow-hidden rounded bg-background-light px-3 text-sm transition-all duration-150 hover:bg-background-light/80"
                                                        onClick={() => {
                                                            handlePageChange(currentPage > 1 ? currentPage - 1 : 1);
                                                        }}
                                                    >
                                                        <span className="relative flex select-none items-center justify-center font-medium text-white">Previous</span>
                                                    </button>
                                                    <div className="flex max-h-[1.75rem] max-w-[50%] flex-wrap gap-2 overflow-y-auto sm:max-w-[80%]">
                                                        {/* Buttons to go to pagination page */}
                                                        {pagination}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="pointer relative flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center overflow-hidden rounded bg-background-light px-3 text-sm transition-all duration-150 hover:bg-background-light/80"
                                                        onClick={() => {
                                                            if (currentPage + 1 > pagination.length) return;
                                                            handlePageChange(currentPage < endIndex ? currentPage + 1 : endIndex - 1);
                                                        }}
                                                    >
                                                        <span className="relative flex select-none items-center justify-center font-medium text-white">Next</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="my-6">{/* Not necessary to have pagination buttons */}</div>
                                        )}
                                        {content.map((provider, index) => (
                                            <div key={String(index) + "-provider"} className={`grid grid-cols-1 gap-5 py-4 text-white md:grid-cols-2 lg:grid-cols-5 ${index > 0 ? "hidden" : ""}`} id={`provider-${index}`}>
                                                {media.type === "ANIME"
                                                    ? (provider as EpisodeData).episodes.map((episode, index: number) => {
                                                          if (currentSearch.length > 0) {
                                                              if (episode.title.toLowerCase().includes(currentSearch.toLowerCase()) || currentSearch.toLowerCase().includes(String(episode.number ?? index))) {
                                                                  if (subDub === "dub" && episode.hasDub) {
                                                                      return <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />;
                                                                  } else if (subDub === "sub") {
                                                                      // Edgecase
                                                                      if (provider.providerId !== "GogoAnime (Dub)") {
                                                                          return <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />;
                                                                      }
                                                                  }
                                                              }
                                                          } else {
                                                              if (index >= startIndex && index < endIndex) {
                                                                  if (subDub === "dub" && episode.hasDub) {
                                                                      return <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />;
                                                                  } else if (subDub === "sub") {
                                                                      // Edgecase
                                                                      if (provider.providerId !== "GogoAnime (Dub)") {
                                                                          return <Chapter key={String(index) + "-chapter"} chapter={episode} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />;
                                                                      }
                                                                  }
                                                              }
                                                          }
                                                      })
                                                    : (provider as ChapterData).chapters.map((chapter, index: number) => {
                                                          if (currentSearch.length > 0) {
                                                              if (chapter.title.toLowerCase().includes(currentSearch.toLowerCase()) || currentSearch.toLowerCase().includes(String(chapter.number ?? index))) {
                                                                  return <Chapter key={String(index) + "-chapter"} chapter={chapter} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />;
                                                              }
                                                          } else {
                                                              if (index >= startIndex && index < endIndex) {
                                                                  return <Chapter key={String(index) + "-chapter"} chapter={chapter} media={media} provider={provider.providerId} index={index + 1} subDub={subDub} />;
                                                              }
                                                          }
                                                      })}
                                            </div>
                                        ))}
                                        <div
                                            className="mb-5 mt-5 flex flex-col lg:grid"
                                            style={{
                                                gridColumnGap: "30px",
                                                gridRowGap: "15px",
                                                gridTemplateColumns: "repeat(3,1fr)",
                                            }}
                                        >
                                            {relations.slice(0, 21).map((relation, index) => (
                                                <div key={index} className="inline-grid h-[115px] grid-cols-[85px_auto] rounded-sm">
                                                    <Link
                                                        href={`/info/${relation.id}`}
                                                        className="rounded-[3px_0_0_3px] bg-cover bg-no-repeat"
                                                        style={{
                                                            backgroundImage: `url(${relation.coverImage ?? ""})`,
                                                        }}
                                                    />
                                                    <div className="relative rounded-[0_3px_3px_0] bg-background-light p-[12px]">
                                                        <div className="text-xs font-semibold text-main">
                                                            <span>{relation.relationType === "SIDE_STORY" ? "Side Story" : relation.relationType === "SPIN_OFF" ? "Spin-Off" : capitalize(relation.relationType)}</span>
                                                        </div>
                                                        <Link href={`/info/${relation.id}`} className="line-clamp-1 text-[rgb(159,173,189)] transition-all duration-200 ease-in-out hover:text-main-primary">
                                                            <span>{relation.title.english ?? relation.title.romaji ?? relation.title.native ?? ""}</span>
                                                        </Link>
                                                        <div className="absolute bottom-[12px] left-[12px] text-xs font-light text-main-text">{parseFormat(relation.format)}</div>
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
            <div
                className={`fixed bottom-0 left-0 right-0 top-0 z-50 mx-auto overflow-auto ${showList ? "translate-y-0" : "pointer-events-none -translate-y-5 opacity-0"} transition-all duration-200 ease-in-out`}
                style={{
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                }}
            >
                <div
                    className="relative m-[0_auto_50px] mt-[15vh] w-full rounded-md bg-[0_0] md:max-w-[80%]"
                    style={{
                        boxShadow: "0 2px 33px rgba(0,0,0,.48)",
                    }}
                >
                    <div className="relative z-20 rounded-[3px_3px_0_0] bg-background p-0">
                        <span className=""></span>
                        <button
                            type="button"
                            className="absolute right-[20px] top-[20px] z-10 cursor-pointer bg-[0_0] p-0 font-bold text-slate-200 outline-none transition-all duration-200 ease-in-out hover:text-slate-400"
                            onClick={() => {
                                setShowList(false);
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="bg-[0_0] p-0">
                        <div
                            className="relative h-[180px] bg-cover bg-no-repeat"
                            style={{
                                boxShadow: "inset 0 0 250px #2f3133",
                                backgroundPosition: "50%",
                                backgroundImage: `url(${media.bannerImage ?? ""})`,
                            }}
                        >
                            <div className="relative z-10 flex h-full items-end justify-end p-[30px] pb-0 lg:p-[50px]">
                                <div className="mb-[-30px] max-w-[100px] overflow-hidden rounded-sm">
                                    <img src={media.coverImage ?? ""} className="w-full" alt={`${media.title.english ?? media.title.romaji ?? media.title.native ?? ""}-cover`} loading="lazy" />
                                </div>
                                <span className="line-clamp-3 p-[20px] text-xl font-medium text-white drop-shadow-lg">{media.title.english ?? media.title.romaji ?? media.title.native}</span>
                                <div className="mb-[13px] ml-auto mr-[10px] flex h-[35px] cursor-pointer items-center justify-center rounded-md bg-[0_0] p-[0_14px] opacity-90">
                                    <svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="inline-block h-[1rem] w-[1rem]">
                                        <path fill="#fff" d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z" className=""></path>
                                    </svg>
                                </div>
                                <button
                                    className="mb-[15px] cursor-pointer rounded-md bg-main p-[8px_14px] text-white"
                                    onClick={() => {
                                        void saveEntry();
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-[auto_16px] bg-background p-[50px] pt-[70px]">
                            <div
                                className="block justify-around grid-areas-listEditor lg:grid"
                                style={{
                                    gridGap: "40px",
                                }}
                            >
                                <div className="mb-[25px] grid-in-status lg:mb-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">Status</span>
                                    <div className="relative z-10 w-full rounded-md bg-background-dark">
                                        <Select
                                            options={listStatus}
                                            classNames={{
                                                control: (state) => (state.isFocused ? "border-main-300" : "border-none"),
                                            }}
                                            className="z-50"
                                            styles={{
                                                container: (baseStyles) => ({
                                                    ...baseStyles,
                                                    color: "white",
                                                    backgroundColor: "#141414",
                                                    border: "none",
                                                    borderRadius: "0.25rem",
                                                    zIndex: "50",
                                                }),
                                                control: (baseStyles) => ({
                                                    ...baseStyles,
                                                    color: "white",
                                                    backgroundColor: "#141414",
                                                    border: "none",
                                                }),
                                                input: (baseStyles) => ({
                                                    ...baseStyles,
                                                    color: "white",
                                                    backgroundColor: "#141414",
                                                    border: "none",
                                                }),
                                                menu: (baseStyles) => ({
                                                    ...baseStyles,
                                                    color: "white",
                                                    backgroundColor: "#333333",
                                                    border: "none",
                                                    zIndex: "50",
                                                }),
                                                menuList: (baseStyles) => ({
                                                    ...baseStyles,
                                                    width: "100%",
                                                    height: "100%",
                                                    zIndex: "50",
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
                                                    zIndex: "50",
                                                }),
                                                valueContainer: (baseStyles) => ({
                                                    ...baseStyles,
                                                    color: "white",
                                                }),
                                                option: (baseStyles) => ({
                                                    ...baseStyles,
                                                    backgroundColor: "#333333",
                                                    color: "white",
                                                    zIndex: "50",
                                                    transition: "0.1s all",
                                                    cursor: "pointer",
                                                    ":hover": {
                                                        backgroundColor: "#1f1f1f",
                                                    },
                                                    ":active": {
                                                        color: "white",
                                                        backgroundColor: "#1f1f1f",
                                                    },
                                                    lineHeight: "1.25rem",
                                                    height: "100%",
                                                }),
                                                indicatorSeparator: (baseStyles) => ({
                                                    ...baseStyles,
                                                    display: "none",
                                                }),
                                                dropdownIndicator: (baseStyles) => ({
                                                    ...baseStyles,
                                                    backgroundColor: "none",
                                                    color: "white",
                                                    transition: "0.1s all",
                                                    ":hover": {
                                                        color: "rgba(255, 255, 255, 0.7)",
                                                    },
                                                    ":active": {
                                                        color: "rgba(255, 255, 255, 0.5)",
                                                    },
                                                }),
                                            }}
                                            defaultValue={listStatus.map((el) => {
                                                if (String(el.value) === listData.status) {
                                                    return el;
                                                }
                                            })}
                                            isSearchable={false}
                                            name="chapter_list"
                                            onChange={(data) => {
                                                setStatus(data?.value ?? "");
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="z-0 mb-[25px] grid-in-score lg:mb-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">Score</span>
                                    <div className="relative z-0 inline-block w-full">
                                        <span
                                            className="absolute bottom-[1px] left-auto right-[-10px] top-auto z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                            style={{
                                                background: "0_0",
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </span>
                                        <span
                                            className="absolute right-[-10px] top-[1px] z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                            style={{
                                                background: "0_0",
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m18 15-6-6-6 6" />
                                            </svg>
                                        </span>
                                        <div className="relative z-10 w-full rounded-md bg-background-dark">
                                            <input type="text" id="score" className="inline-block h-[40px] w-full rounded-md border-0 bg-background-dark p-[0_15px] pl-[15px] pr-[50px] text-left text-white outline-none" defaultValue={listData.score} />
                                        </div>
                                    </div>
                                </div>
                                <div className="z-0 mb-[25px] grid-in-progress lg:mb-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">{media.type === Type.ANIME ? "Episode Progress" : "Chapter Progress"}</span>
                                    <div className="relative z-0 inline-block w-full">
                                        <span
                                            className="absolute bottom-[1px] left-auto right-[-10px] top-auto z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                            style={{
                                                background: "0_0",
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </span>
                                        <span
                                            className="absolute right-[-10px] top-[1px] z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                            style={{
                                                background: "0_0",
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m18 15-6-6-6 6" />
                                            </svg>
                                        </span>
                                        <div className="relative z-10 w-full rounded-md bg-background-dark">
                                            <input type="text" id="progress" className="inline-block h-[40px] w-full rounded-md border-0 bg-background-dark p-[0_15px] pl-[15px] pr-[50px] text-left text-white outline-none" defaultValue={listData.progress} />
                                        </div>
                                    </div>
                                </div>
                                {media.type === Type.MANGA ? (
                                    <div className="grid-in-volumes z-0 mb-[25px] lg:mb-0">
                                        <span className="pb-[8px] pl-[1px] text-gray-200">Volume Progress</span>
                                        <div className="relative z-0 inline-block w-full">
                                            <span
                                                className="absolute bottom-[1px] left-auto right-[-10px] top-auto z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                                style={{
                                                    background: "0_0",
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="m6 9 6 6 6-6" />
                                                </svg>
                                            </span>
                                            <span
                                                className="absolute right-[-10px] top-[1px] z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                                style={{
                                                    background: "0_0",
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                    <path d="m18 15-6-6-6 6" />
                                                </svg>
                                            </span>
                                            <div className="relative z-10 w-full rounded-md bg-background-dark">
                                                <input type="text" id="progressVolumes" className="inline-block h-[40px] w-full rounded-md border-0 bg-background-dark p-[0_15px] pl-[15px] pr-[50px] text-left text-white outline-none" defaultValue={listData.progressVolumes} />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                <div className="z-0 mb-[25px] grid-in-start lg:mb-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">Start Date</span>
                                    <div className="relative z-0 inline-block w-full">
                                        <div className="relative z-10 w-full rounded-md bg-background-dark">
                                            <input type="text" id="startDate" className="inline-block h-[40px] w-full rounded-md border-0 bg-background-dark p-[0_15px] pl-[15px] pr-[50px] text-left text-white outline-none" defaultValue={listData.startedAt ? `${String(listData.startedAt?.getMonth())}/${String(listData.startedAt?.getDay())}/${String(listData.startedAt?.getFullYear())}` : ""} />
                                        </div>
                                    </div>
                                </div>
                                <div className="z-0 mb-[25px] grid-in-finish lg:mb-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">Finish Date</span>
                                    <div className="relative z-0 inline-block w-full">
                                        <div className="relative z-10 w-full rounded-md bg-background-dark">
                                            <input type="text" id="finishDate" className="inline-block h-[40px] w-full rounded-md border-0 bg-background-dark p-[0_15px] pl-[15px] pr-[50px] text-left text-white outline-none" defaultValue={listData.completedAt ? `${String(listData.completedAt?.getMonth())}/${String(listData.completedAt?.getDay())}/${String(listData.completedAt?.getFullYear())}` : ""} />
                                        </div>
                                    </div>
                                </div>
                                <div className="z-0 mb-[25px] grid-in-repeat lg:mb-0">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">Repeats</span>
                                    <div className="relative z-0 inline-block w-full">
                                        <span
                                            className="absolute bottom-[1px] left-auto right-[-10px] top-auto z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                            style={{
                                                background: "0_0",
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </span>
                                        <span
                                            className="absolute right-[-10px] top-[1px] z-20 h-auto w-[40px] rounded-[0_0_4px_0] border-0 border-r-0 border-l-[1px_solid_#dcdfe6] text-center text-white"
                                            style={{
                                                background: "0_0",
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                                <path d="m18 15-6-6-6 6" />
                                            </svg>
                                        </span>
                                        <div className="relative z-10 w-full rounded-md bg-background-dark">
                                            <input type="text" id="repeats" className="inline-block h-[40px] w-full rounded-md border-0 bg-background-dark p-[0_15px] pl-[15px] pr-[50px] text-left text-white outline-none" defaultValue={listData.repeat} />
                                        </div>
                                    </div>
                                </div>
                                <div className="z-0 grid-in-notes">
                                    <span className="pb-[8px] pl-[1px] text-gray-200">Notes</span>
                                    <div className="z-0 inline-block w-full rounded-md bg-background-dark text-gray-400">
                                        <textarea autoComplete="off" id="notes" className="w-full border-none bg-background-dark px-2 pt-[10px] outline-none" defaultValue={listData.notes}></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export const getServerSideProps = async ({ query }: { query: { id: string } }) => {
    const { id } = query;

    const media = (await (await axios.get(`${env.BACKEND_URL ?? ""}/info?id=${id}&apikey=${env.API_KEY ?? ""}`)).data) as Anime | Manga;
    const relations = (await (await axios.get(`${env.BACKEND_URL ?? ""}/relations?id=${id}&apikey=${env.API_KEY ?? ""}`)).data) as Anime | Manga;

    const contentType = media.type === Type.ANIME ? "episodes" : "chapters";
    const content = (await (await axios.get(`${env.BACKEND_URL ?? ""}/${contentType}?id=${id}&apikey=${env.API_KEY ?? ""}`)).data) as EpisodeData[] | ChapterData[];

    if (media.type === Type.ANIME) {
        const episodeCovers = (await (await axios.get(`${env.BACKEND_URL ?? ""}/content-metadata?id=${id}&apikey=${env.API_KEY ?? ""}`)).data) as { providerId: string; data: Episode[] }[];

        for (let i = 0; i < content.length; i++) {
            const episodes = (content as EpisodeData[])[i]?.episodes ?? [];
            for (let j = 0; j < episodes.length; j++) {
                const episodeNumber = episodes[j]?.number ?? 0;
                for (let k = 0; k < episodeCovers.length; k++) {
                    for (let l = 0; l < (episodeCovers[k]?.data ?? []).length; l++) {
                        if (episodeCovers[k]?.data[l]?.number === episodeNumber && episodeCovers[k]?.data[l]?.img) {
                            if (!episodes[j]?.img) {
                                Object.assign((content as EpisodeData[])[i]?.episodes[j] ?? {}, { img: episodeCovers[k]?.data[l]?.img });
                            }
                            break;
                        }
                    }
                }
            }
        }

        return {
            props: {
                media,
                relations,
                content,
            },
        };
    } else {
        return {
            props: {
                media,
                relations,
                content,
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
