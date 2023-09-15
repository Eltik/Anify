/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MediaCaptions, MediaFullscreenButton, MediaMuteButton, MediaOutlet, MediaPlayButton, MediaPlayer, MediaSliderThumbnail, MediaSliderValue, MediaTime, MediaTimeSlider, MediaTooltip, MediaVolumeSlider } from "@vidstack/react";
import axios from "axios";

import { type GetServerSideProps, type NextPage } from "next";
import { useEffect, useRef, useState } from "react";
import { TextTrack, type MediaPlayerElement } from "vidstack";

import "vidstack/styles/defaults.css";
import styles from "~/styles/watch.module.css"

import { env } from "~/env.mjs";
import { capitalize } from "~/helper";
import { type WatchTime, type Anime, type EpisodeData, type Source } from "~/types";
import { SettingsPanel } from "~/components/settingsPanel";
import { ChaptersPanel } from "~/components/chaptersPanel";
import Head from "next/head";
import Link from "next/link";
import { useAutoFullscreen, useAutoNext, useAutoSkip, useSpeed, useSubtitles, useWatchTime } from "~/store/store";
import { useStore } from "zustand";

const Watch: NextPage<Props> = ({ episodeNumber, episodeSelector, episodes, media, sources, subtitles, provider, watchId, thumbnails, subDub }) => {
    const [src, setSrc] = useState(sources.sources[sources.sources.length - 1]?.url ?? "");
    
    const [open, setOpen] = useState(false);
    const [showChapters, setShowChapters] = useState(false);
    
    const watchTime = useStore(useWatchTime, ((state: any) => state.currentTime as WatchTime[]));
    const autoSkip = useStore(useAutoSkip, ((state: any) => state.autoSkip as boolean));
    const autoNext = useStore(useAutoNext, ((state: any) => state.autoNext as boolean));
    const autoFullscreen = useStore(useAutoFullscreen, ((state: any) => state.autoFullscreen as boolean));
    const subs = useStore(useSubtitles, ((state: any) => state.subtitles as boolean));
    const speed = useStore(useSpeed, ((state: any) => state.speed as number));

	const playerRef = useRef<MediaPlayerElement>(null);
    
    const banners = media.artwork.filter((x) => x.type === "banner" && x.providerId === "tvdb");
    const playerPoster = banners.length ? banners[Math.floor(Math.random() * banners.length)] : { img: media.bannerImage };

    useEffect(() => {
        addCues();

        disableSubs(subs ?? false);
        changeSpeed(speed ?? 1);
        
        let currentWatchTime: number | undefined = undefined;

        playerRef.current?.addEventListener("play", ((event) => {
            if (playerRef.current?.currentTime != watchTime?.[currentWatchTime ?? 0]?.currentTime) {
                Object.assign(playerRef.current ?? {}, { currentTime: watchTime?.[currentWatchTime ?? 0]?.currentTime });
            }
        }));

        playerRef.current?.addEventListener("end", ((event) => {
            goNext();
        }))

        playerRef.current?.addEventListener("ended", ((event) => {
            goNext();
        }))

        playerRef.current?.addEventListener("loaded-data", ((event) => {
            if (playerRef.current?.currentTime != watchTime?.[currentWatchTime ?? 0]?.currentTime) {
                Object.assign(playerRef.current ?? {}, { currentTime: watchTime?.[currentWatchTime ?? 0]?.currentTime });
            }
        }));

        playerRef.current?.subscribe(({ currentTime }) => {
            // Remove duplicates
            for (let i = 0; i < (watchTime ?? []).length; i++) {
                if (watchTime?.[i]?.episodeNumber != episodeNumber && watchTime?.[i]?.mediaId === media.id) {
                    watchTime?.splice(i, 1);
                }
            }

            for (let i = 0; i < (watchTime ?? []).length; i++) {
                if (watchTime?.[i]?.episodeNumber === episodeNumber && watchTime?.[i]?.mediaId === media.id) {
                    currentWatchTime = i;
                }
            }
    
            if (currentWatchTime === undefined) {
                const newWatchTime = {
                    currentTime,
                    episodeNumber,
                    mediaId: media.id,
                    coverImage: media.coverImage ?? "",
                    title: media.title,
                    duration: playerRef.current?.style.getPropertyValue("--media-duration") ?? 0,
                    watchId,
                    providerId: provider,
                    subDub
                } as WatchTime;

                currentWatchTime = watchTime?.length;

                // Move it to the front
                watchTime?.unshift(newWatchTime);
            } else {
                if (currentTime != 0) {
                    // Move to the front
                    const temp = watchTime[currentWatchTime];
                    watchTime?.splice(currentWatchTime, 1);
                    temp ? watchTime?.unshift(temp) : null;

                    Object.assign(watchTime?.[currentWatchTime] ?? {}, { currentTime });
                    Object.assign(watchTime?.[currentWatchTime] ?? {}, { duration: playerRef.current?.style.getPropertyValue("--media-duration") ?? 0 });
                } else {
                    // Move to the front
                    const temp = watchTime[currentWatchTime];
                    watchTime?.splice(currentWatchTime, 1);
                    temp ? watchTime?.unshift(temp) : null;

                    Object.assign(watchTime?.[currentWatchTime] ?? {}, { currentTime });
                }
            }
            
            useWatchTime.setState({ currentTime: watchTime });

            if (autoSkip) {
                const opStart = sources.intro?.start ?? 0;
                const opEnd = sources.intro?.end ?? 0;

                const epStart = sources.outro?.start ?? 0;
                const epEnd = sources.outro?.end ?? 0;

                if (currentTime > opStart && currentTime < opEnd) {
                    console.log("Skipping OP...");
                    Object.assign(playerRef.current ?? {}, { currentTime: opEnd });
                    return null;
                }
                if (currentTime > epStart && currentTime < epEnd) {
                    console.log("Skipping EP...");
                    Object.assign(playerRef.current ?? {}, { currentTime: epEnd });
                    return null;
                }
            }

            if (Math.round(currentTime) != 0 && Math.round(Number(playerRef.current?.style.getPropertyValue("--media-duration") ?? 0)) != 0) {
                if (Math.round(currentTime) === Math.round(Number(playerRef.current?.style.getPropertyValue("--media-duration") ?? 0))) {
                    goNext();
                }
            }
        });

        function goNext() {
            const providerEpisodes = episodes.find(providerEps => providerEps.providerId === provider);
    
            if (providerEpisodes) {
                const currentIndex = providerEpisodes.episodes.findIndex(episode => episode.id === watchId);
                const nextEpisodeId = providerEpisodes.episodes[currentIndex + 1]?.id ?? "";
                
                if (autoNext && nextEpisodeId) {
                    const nextUrl = `/watch/${media.id}/${provider}/${encodeURIComponent(nextEpisodeId)}/${subDub}`;
                    window.location.href = nextUrl;
                }
            }
        }
    })

    function changeQuality(value: string) {
        const time = playerRef.current?.currentTime ?? 0;
        setSrc(value ?? "");

        setTimeout(() => {
            Object.assign(playerRef.current ?? {}, { currentTime: time });

            void playerRef.current?.play().catch(() => {
                //
            });
        })
    }

    function changeSub(value?: string) {
        const tracks = playerRef.current?.textTracks.toArray();

        const index = tracks?.filter((x) => x.kind === "subtitles").findIndex((x) => x.src === value);

        playerRef.current?.textTracks.toArray()[index ?? 0]?.setMode("showing");
    }

    function disableSubs(value: boolean) {
        useSubtitles.setState({ subtitles: value });

        if (value) {
            const tracks = playerRef.current?.textTracks.toArray();

            tracks?.forEach((track) => {
                if (track.kind === "subtitles") {
                    track.mode = value ? "disabled" : "showing";
                }
            })
        } else {
            const tracks = playerRef.current?.textTracks.toArray();

            tracks?.forEach((track) => {
                if (track.kind === "subtitles" && track.label?.toLowerCase() === "english") {
                    track.mode = "showing";
                } else if (track.kind === "subtitles") {
                    track.mode = "disabled";
                }
            })
        }
    }

    function changeSpeed(value: number) {
        Object.assign(playerRef.current ?? {}, { playbackRate: value });
        useSpeed.setState({ speed: value });
    }

    const changeAutoNext = (value?: boolean) => {
        useAutoNext.setState({ autoNext: value ?? false })
    };

    const changeAutoFullscreen = (value?: boolean) => {
        useAutoFullscreen.setState({ autoFullscreen: value ?? false })
    };

    const changeAutoSkip = (value?: boolean) => {
        useAutoSkip.setState({ autoSkip: value ?? false })
    };

    function updateFontColor(value?: string) {
        //
    }

    function updateBackground(value?: string) {
        //
    }

    function updateFontSize(value?: string) {
        const captions = document.querySelector("." + String(styles.captions));

        if (captions instanceof HTMLElement) {
            captions.style.setProperty("--cue-font-size", `calc(var(--overlay-height) / 100 * ${value ?? ""})`);
        }
    }

    function updateCueMt(_value?: string) {
        //
    }

    function updateCueMb(_value?: string) {
        //
    }

    function addCues() {
        const introStart = sources.intro.start ?? 0;
        const introEnd = sources.intro.end ?? 1;
        const outroStart = sources.outro.start ?? 0;
        const outroEnd = sources.outro.end ?? 0;

        let useIntro = true;
        let useOutro = true;

        if (introEnd <= introStart) {
            useIntro = false;
        }
        
        if (outroEnd <= outroStart) {
            useOutro = false;
        }

        const array = [];
        
        if (useIntro) {
            array.push({
                start: introStart,
                end: introEnd,
                name: "Intro"
            })
        }

        if (useOutro) {
            array.push({
                start: outroStart,
                end: outroEnd,
                name: "Outro"
            })
        }

        const webVTTChapters = convertToWebVTT(array);

        const cues = getBase64Chapters(webVTTChapters);

        const track = new TextTrack({
            kind: "chapters",
            src: cues,
        });

        //playerRef?.current?.textTracks.add(track);

        /*
        playerRef?.current?.textTracks.toArray().forEach((track) => {
            if (track.kind === "chapters") {
                track.mode = "showing";
            }
        })
        */

        function getBase64Chapters(chapters: string) {
            const encoder = new TextEncoder();
            const chaptersData = encoder.encode(chapters);
            const base64Chapters = base64ArrayBuffer(chaptersData.buffer);
            return `data:text/vtt;base64,${base64Chapters}`;
        }

        function base64ArrayBuffer(buffer: ArrayBuffer): string {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i] ?? 0);
            }
            
            return btoa(binary);
        }

        function convertToWebVTT(data: { start: number, end: number, name: string }[]): string {
            let webVTT = "WEBVTT\n\n";
            
            for (let i = 0; i < data.length; i++) {
                const entry = data[i];
                const start = formatTime(entry?.start ?? 0);
                const end = formatTime(entry?.end ?? 0);
            
                webVTT += `${start} --> ${end}\n`;
                webVTT += `${entry?.name ?? ""}\n`;
                webVTT += "\n";
            }
            
            return webVTT;
        }

        function formatTime(time: number | string): string {
            const seconds = Number(time);
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = seconds % 60;
            
            const formattedHours = padZero(Math.floor(hours));
            const formattedMinutes = padZero(Math.floor(minutes));
            const formattedSeconds = padZero(Math.floor(remainingSeconds));
            
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}.000`;
        }

        function padZero(value: number): string {
            return value.toString().padStart(2, '0');
        }
    }

    return (
        <>
            <Head>
                <title>{"Episode " + String(episodeNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")}</title>
                <meta name="title" content={"Episode " + String(episodeNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")} />
                <meta name="description" content={"Watch anime with no ads and a customizable experience only on Anify."} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://anify.tv/watch/${media.id}/${provider}/${encodeURIComponent(watchId)}`} />
                <meta property="og:title" content={"Episode " + String(episodeNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")} />
                <meta property="og:description" content={"Watch anime with no ads and a customizable experience only on Anify."} />
                <meta property="og:image" content={"https://anify.tv/api/info?id=" + media.id} />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://anify.tv/watch/${media.id}/${provider}/${encodeURIComponent(watchId)}`} />
                <meta property="twitter:title" content={"Episode " + String(episodeNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")} />
                <meta property="twitter:description" content={"Watch anime with no ads and a customizable experience only on Anify."} />
                <meta property="twitter:image" content={"https://anify.tv/api/info?id=" + media.id} />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="flex w-[100vw] h-[100vh] justify-center items-center bg-gradient-to-b from-[#191A1C] to-[#191A1C] overflow-x-hidden" id="player-container">
                <MediaPlayer
                    ref={playerRef}
                    title={media.title.english ?? media.title.romaji ?? media.title.native ?? ""}
                    className={`flex flex-col w-full h-full justify-center items-center ${styles.mediaPlayer ?? ""}`}
                    poster={playerPoster?.img ?? ""}
                    aspectRatio={16/9}
                    crossorigin={"anonymous"}
                    src={{
                        src: src,
                        type: "application/x-mpegurl"
                    }}
                    textTracks={sources.subtitles.map((sub) => {
                        return {
                            id: sub.lang,
                            label: sub.label ?? sub.lang,
                            kind: "subtitles",
                            src: sub.url,
                            language: sub.lang,
                            default: sub.label ? (sub.label?.toLowerCase() === "english" || sub.label?.toLowerCase() === "en-us") : (sub.lang?.toLowerCase() === "english" || sub.lang?.toLowerCase() === "en-us"),
                        }
                    })}
                    thumbnails={thumbnails}
                >
                    <MediaOutlet>
                        <MediaCaptions className={styles.captions} />
                    </MediaOutlet>
                    <div className={styles.mediaBufferingContainer}>
                        <svg className={styles.mediaBufferingIcon} fill="none" viewBox="0 0 120 120" aria-hidden="true">
                            <circle className="opacity-25" cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="8" />
                            <circle className="opacity-75" cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="10" pathLength="100" style={{
                                strokeDasharray: 100,
                                strokeDashoffset: 50,
                            }}/>
                        </svg>
                    </div>
                    <div className={`absolute flex flex-col justify-between items-center top-0 left-0 w-full h-full z-30 transition-all duration-300 ease-in-out ${styles.ui ?? ""} media-controls`} role="group" aria-label="Media Controls" style={{
                        background: "linear-gradient(180deg,rgba(0,0,0,.7),transparent 49.48%,rgba(0,0,0,.7))"
                    }} onClick={(event) => {
                        if ((event.target as HTMLElement)?.className?.includes?.("media-controls")) {
                            if (playerRef.current?.paused) {
                                void playerRef.current?.play();
                            } else {
                                void playerRef.current?.pause();
                            }
                        }
                    }}>
                        <div className={`${styles.mediaControlsGroup ?? ""} flex flex-col justify-center items-center text-2xl w-full`}>
                            <div className="flex flex-row justify-between items-center text-white w-full">
                                <div className={`flex flex-row justify-start items-center ${styles.ui ?? ""}`}>
                                    <Link href={`/info/${media.id}`} className="w-[40px] h-[40px] mt-[5px] ml-[10px] cursor-pointer stroke-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" className="transition-all decoration-neutral-150 ease-linear"><path stroke="inherit" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="3" d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08"></path></svg>
                                    </Link>
                                </div>
                                <div className={`${styles.ui ?? ""} text-xl md:text-2xl leading-0 line-clamp-3 sm:line-clamp-2 overflow-hidden`}>{media.title.english ?? media.title.romaji ?? media.title.native}</div>
                                <div className={`${styles.ui ?? ""} flex flex-row justify-center items-center gap-1`}>
                                <div className="p-[4px] rounded-sm pb-0 mb-1 transition-all duration-200 cursor-pointer ease-in-out hover:bg-[hsla(0,0%,76%,.2)]" onClick={() => {
                                        setOpen(!open);
                                        setShowChapters(false);
                                    }}>
                                        <svg className="material-symbols-outlined media-settings-icon" style={{
                                            transform: open ? "rotate(35deg)" : "rotate(0deg)", transition: "0.3s all ease",
                                        }} width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M7.87568 0.666664C7.58751 0.666664 7.34252 0.87709 7.29903 1.16196L6.85555 4.06677C6.85001 4.10301 6.82774 4.13448 6.79561 4.15213C6.70884 4.19979 6.62325 4.24932 6.53889 4.30067C6.50752 4.31977 6.46906 4.32337 6.43485 4.31003L3.69626 3.24231C3.42784 3.13766 3.12323 3.24463 2.97918 3.49413L0.85547 7.17251C0.711385 7.42207 0.771125 7.73945 0.996083 7.91955L3.29145 9.75719C3.32008 9.78011 3.3362 9.81515 3.3354 9.85181C3.33433 9.90086 3.3338 9.95004 3.3338 9.99935C3.3338 10.0488 3.33434 10.0981 3.33541 10.1473C3.33621 10.184 3.3201 10.219 3.29149 10.2419L0.996515 12.0805C0.771678 12.2607 0.712012 12.578 0.856059 12.8275L2.97977 16.5058C3.12386 16.7554 3.42859 16.8624 3.69704 16.7576L6.43522 15.6889C6.46944 15.6756 6.50792 15.6792 6.5393 15.6983C6.62352 15.7495 6.70896 15.799 6.79558 15.8465C6.82771 15.8642 6.84999 15.8957 6.85552 15.9319L7.29903 18.8369C7.34252 19.1218 7.58751 19.3322 7.87568 19.3322H12.1231C12.4112 19.3322 12.6561 19.1219 12.6997 18.8371L13.1442 15.9325C13.1497 15.8963 13.172 15.8649 13.2041 15.8472C13.2912 15.7994 13.3772 15.7497 13.4619 15.6981C13.4932 15.679 13.5317 15.6754 13.5659 15.6888L16.303 16.757C16.5715 16.8618 16.8762 16.7548 17.0203 16.5053L19.144 12.8269C19.2881 12.5774 19.2284 12.2601 19.0035 12.08L16.7094 10.242C16.6808 10.2191 16.6647 10.1841 16.6655 10.1474C16.6666 10.0982 16.6671 10.0488 16.6671 9.99935C16.6671 9.95 16.6666 9.90078 16.6655 9.85169C16.6647 9.81503 16.6809 9.77998 16.7095 9.75707L19.004 7.92012C19.2289 7.74002 19.2887 7.42264 19.1446 7.17307L17.0209 3.4947C16.8768 3.2452 16.5722 3.13823 16.3038 3.24288L13.5663 4.31017C13.5321 4.32351 13.4936 4.31991 13.4623 4.30081C13.3774 4.24917 13.2914 4.19937 13.2041 4.15146C13.172 4.13383 13.1497 4.10236 13.1442 4.06613L12.6997 1.16176C12.6561 0.876982 12.4112 0.666664 12.1231 0.666664H7.87568ZM10.0001 13.7497C12.0713 13.7497 13.7504 12.0706 13.7504 9.99939C13.7504 7.92814 12.0713 6.24906 10.0001 6.24906C7.92881 6.24906 6.24974 7.92814 6.24974 9.99939C6.24974 12.0706 7.92881 13.7497 10.0001 13.7497Z"/>
                                        </svg>
                                    </div>
                                    <div onClick={() => {
                                            setShowChapters(!showChapters);
                                            setOpen(false);
                                        }} className="bg-[hsla(0,0%,76%,0)] rounded-sm p-[5px] w-[32px] h-[32px] flex justify-center items-center ml-auto mr-[12px] cursor-pointer hover:bg-[hsla(0,0%,76%,.2)] transition-all duration-200">
                                        <svg width="20" height="18" viewBox="0 0 20 18" fill="white" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.6061 17.1678C10.284 17.1678 10.0228 16.9066 10.0228 16.5844L10.0228 1.41778C10.0228 1.09561 10.284 0.834442 10.6061 0.834442L12.3561 0.834442C12.6783 0.834442 12.9395 1.09561 12.9395 1.41778L12.9395 16.5844C12.9395 16.9066 12.6783 17.1678 12.3561 17.1678H10.6061Z" />
                                            <path d="M17.0228 17.1678C16.7006 17.1678 16.4395 16.9066 16.4395 16.5844L16.4395 1.41778C16.4395 1.09561 16.7006 0.834442 17.0228 0.834442L18.7728 0.834442C19.095 0.834442 19.3561 1.09561 19.3561 1.41778V16.5844C19.3561 16.9066 19.095 17.1678 18.7728 17.1678H17.0228Z" />
                                            <path d="M0.796022 15.9481C0.71264 16.2593 0.897313 16.5791 1.2085 16.6625L2.89887 17.1154C3.21006 17.1988 3.52992 17.0141 3.61331 16.703L7.53873 2.05308C7.62211 1.74189 7.43744 1.42203 7.12625 1.33865L5.43588 0.885715C5.12469 0.802332 4.80483 0.987005 4.72144 1.29819L0.796022 15.9481Z" />
                                        </svg>
                                    </div>

                                    <SettingsPanel
                                        setIsOpen={setOpen}
                                        isOpen={open}
                                        menuCon={
                                            [
                                                {
                                                    id: "initial",
                                                    items: [
                                                        {
                                                            html: "<div style='color: white'>Speed</div>",
                                                            iconID: "speedIcon",
                                                            open: "speed",
                                                        },
                                                        {
                                                            html: "<div style='color: white'>Quality</div>",
                                                            iconID: "qualIcon",
                                                            open: "quality",
                                                        },
                                                        {
                                                            html: "<div style='color: white'>Subtitles</div>",
                                                            iconID: "sourceIcon",
                                                            open: "subtitle",
                                                        },
                                                        {
                                                            html: "<div style='color: white'>Settings</div>",
                                                            iconID: "configIcon",
                                                            open: "config",
                                                        },
                                                    ],
                                                },
                                                {
                                                    id: "speed",
                                                    selectableScene: true,
                                                    heading: {
                                                        html: "<div style='color: white'>Speed</div>",
                                                        open: "speed",
                                                        hideSubArrow: true,
                                                    },
                                                    items: [
                                                        {
                                                            html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 0.1x</div>`,
                                                            callback: () => changeSpeed(0.1),
                                                            highlightable: true,
                                                            selected: speed === 0.1 ? true : false,
                                                        },
                                                        {
                                                            html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 0.5x</div>`,
                                                            callback: () => changeSpeed(0.5),
                                                            highlightable: true,
                                                            selected: speed === 0.5 ? true : false,
                                                        },
                                                        {
                                                            html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 1x</div>`,
                                                            callback: () => changeSpeed(1),
                                                            highlightable: true,
                                                            selected: speed === 1 ? true : false,
                                                        },
                                                        {
                                                            html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 1.5x</div>`,
                                                            callback: () => changeSpeed(1.5),
                                                            highlightable: true,
                                                            selected: speed === 1.5 ? true : false,
                                                        },
                                                        {
                                                            html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 2x</div>`,
                                                            callback: () => changeSpeed(2),
                                                            highlightable: true,
                                                            selected: speed === 2 ? true : false,
                                                        },
                                                    ],
                                                },
                                                {
                                                    id: "quality",
                                                    selectableScene: true,
                                                    heading: {
                                                        html: "<div style='color: white'>Quality</div>",
                                                        open: "quality",
                                                        hideSubArrow: true,
                                                    },
                                                    items: sources && sources.sources[0] ? sources.sources.map((ep) => {
                                                        return {
                                                            html: `<div class="qualityItem"><div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div>${
                                                                ep.quality
                                                            }</div><h4 class="hdText">${
                                                                ep.quality == "1080p"
                                                                    ? "HD"
                                                                    : ep.quality == "720p"
                                                                    ? "SD"
                                                                    : ""
                                                            }</h4></div>`,
                                                            altText: ep.quality,
                                                            callback: () => changeQuality(ep.url),
                                                            highlightable: true,
                                                            selected: ep.url === src,
                                                        };
                                                    }) : [],
                                                },
                                                {
                                                    id: "subtitle",
                                                    selectableScene: true,
                                                    heading: {
                                                        text: "<div style='color: white'>Subtitles</div>",
                                                    },
                                                    items: subtitles.map((sub) => {
                                                        if (!sub.open) {
                                                            return {
                                                                text: sub.text,
                                                                callback: () => changeSub(sub.url),
                                                                highlightable: true,
                                                                selected: sub.text == "English" ? true : false,
                                                            };
                                                        } else {
                                                            return {
                                                                text: "Styling",
                                                                iconID: "fillIcon",
                                                                open: "subStyle",
                                                            }
                                                        }
                                                    }),
                                                },
                                                {
                                                    id: "subStyle",
                                                    selectableScene: true,
                                                    heading: {
                                                        text: "<div style='color: white'>Subtitle Styling</div>",
                                                    },
                                                    items: [
                                                        {
                                                            text: "Disable Subs",
                                                            toggle: true,
                                                            toggleOn: () => disableSubs(true),
                                                            toggleOff: () => disableSubs(false),
                                                        },
                                                        {
                                                            text: "Font Color",
                                                            textBox: true,
                                                            value: "TBD",
                                                            customId: "fontColor",
                                                            onInput: function (value: any) {
                                                                updateFontColor(value.target.value);
                                                            },
                                                        },
                                                        {
                                                            text: "Bg. Color",
                                                            textBox: true,
                                                            value: "TBD",
                                                            customId: "bgColor",
                                                            onInput: function (value: any) {
                                                                updateBackground(value.target.value);
                                                            },
                                                        },
                                                        {
                                                            text: "Font Size",
                                                            textBox: true,
                                                            value: "3.5",
                                                            customId: "fontSize",
                                                            onInput: function (value: any) {
                                                                updateFontSize(value.target.value);
                                                            },
                                                        },
                                                        {
                                                            text: "Margin Top",
                                                            textBox: true,
                                                            value: "TBD",
                                                            customId: "marginTop",
                                                            onInput: function (value: any) {
                                                                updateCueMt(value.target.value);
                                                            },
                                                        },
                                                        {
                                                            text: "Margin Bottom",
                                                            textBox: true,
                                                            value: "TBD",
                                                            customId: "marginBottom",
                                                            onInput: function (value:any) {
                                                                updateCueMb(value.target.value);
                                                            },
                                                        },
                                                    ],
                                                },
                                                {
                                                    id: "fillmode",
                                                    heading: {
                                                        text: "<div style='color: white'>Fill Mode</div>",
                                                    },
                                                    items: [
                                                        {
                                                            text: "Normal",
                                                            highlightable: true,
                                                            selected: true,
                                                        },
                                                        {
                                                            text: "Stretch",
                                                            highlightable: true,
                                                        },
                                                        {
                                                            text: "Subtitles",
                                                            highlightable: true,
                                                        },
                                                        {
                                                            text: "Fill",
                                                            open: "quality",
                                                            // "highlightable": true
                                                        },
                                                    ],
                                                },
                                
                                                {
                                                    id: "config",
                                                    heading: {
                                                        text: "<div style='color: white'>Settings</div>",
                                                        back: true,
                                                    },
                                                    items: [
                                                        {
                                                            html: '<h3 class="qualityText" id="auto-next">Auto-Next</h3>',
                                                            customId: "autoNext",
                                                            toggle: true,
                                                            toggleOn: () => changeAutoNext(true),
                                                            toggleOff: () => changeAutoNext(false),
                                                            on: autoNext ? true : false
                                                        },
                                                        {
                                                            html: '<h3 class="qualityText" id="auto-fullscreen">Auto-Fullscreen</h3>',
                                                            customId: "autoFullscreen",
                                                            toggle: true,
                                                            toggleOn: () => changeAutoFullscreen(true),
                                                            toggleOff: () => changeAutoFullscreen(false),
                                                            on: autoFullscreen ? true : false
                                                        },
                                                        {
                                                            html: '<h3 class="qualityText" id="auto-skip">Auto-Skip</h3>',
                                                            customId: "autoSkip",
                                                            toggle: true,
                                                            toggleOn: () => changeAutoSkip(true),
                                                            toggleOff: () => changeAutoSkip(false),
                                                            on: autoSkip ? true : false
                                                        },
                                                    ],
                                                },
                                            ]
                                        }
                                    />
                                    <ChaptersPanel
                                        contentSelector={episodeSelector}
                                        showChapters={showChapters}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={`${styles.mediaControlsGroup ?? ""}`} />
                        <div className={`${styles.mediaControlsGroup ?? ""} flex flex-row w-full md:w-[95%] gap-3 justify-between items-center justify-self-center z-30 opacity-100 transition-all duration-300 ease-in-out`} style={{
                            gridArea: "1/1/1/1"
                        }}>
                            <div className={`${styles.ui ?? ""} flex flex-row justify-center items-center gap-[3px] sm:gap-[15px] z-30 z-100 font-bold`}>
                                <div className="flex center justify-center items-center h-[35px] transition-all duration-200 hover:bg-[hsla(0,0%,76%,.2)] rounded-md">
                                    <MediaPlayButton aria-keyshortcuts="Space">
                                        <svg slot="play" height="32" id="Layer_1" version="1.1" viewBox="0 0 512 512" width="32" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" {...({} as any)}>
                                            <path d="M405.2,232.9L126.8,67.2c-3.4-2-6.9-3.2-10.9-3.2c-10.9,0-19.8,9-19.8,20H96v344h0.1c0,11,8.9,20,19.8,20  c4.1,0,7.5-1.4,11.2-3.4l278.1-165.5c6.6-5.5,10.8-13.8,10.8-23.1C416,246.7,411.8,238.5,405.2,232.9z" fill="#fff" />
                                        </svg>
                                        <svg slot="replay" height="32" id="Layer_1" version="1.1" viewBox="0 0 512 512" width="32" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" {...({} as any)}>
                                            <path d="M405.2,232.9L126.8,67.2c-3.4-2-6.9-3.2-10.9-3.2c-10.9,0-19.8,9-19.8,20H96v344h0.1c0,11,8.9,20,19.8,20  c4.1,0,7.5-1.4,11.2-3.4l278.1-165.5c6.6-5.5,10.8-13.8,10.8-23.1C416,246.7,411.8,238.5,405.2,232.9z" fill="#fff" />
                                        </svg>
                                        <svg slot="pause" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" className="transition-all decoration-neutral-150 ease-linear" {...({} as any)}>
                                            <path d="M10.65 19.11V4.89c0-1.35-.57-1.89-2.01-1.89H5.01C3.57 3 3 3.54 3 4.89v14.22C3 20.46 3.57 21 5.01 21h3.63c1.44 0 2.01-.54 2.01-1.89ZM21.002 19.11V4.89c0-1.35-.57-1.89-2.01-1.89h-3.63c-1.43 0-2.01.54-2.01 1.89v14.22c0 1.35.57 1.89 2.01 1.89h3.63c1.44 0 2.01-.54 2.01-1.89Z" fill="#ffffff"></path>
                                        </svg>
                                        <MediaTooltip position="top center">
                                            <span slot="play">Play</span>
                                            <span slot="pause">Pause</span>
                                        </MediaTooltip>
                                    </MediaPlayButton>
                                </div>
                                <div className="flex center justify-center items-center transition-all duration-200 hover:bg-[hsla(0,0%,76%,.2)] rounded-md">
                                    <MediaMuteButton aria-keyshortcuts="m" className="sm:mx-2">
                                        <svg slot="volume-high" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...({} as any)}>
                                            <path d="M17.5091 24.6595C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9992 9.36923 19.9992H4.66667C4.29848 19.9992 4 19.7007 4 19.3325V12.6658C4 12.2976 4.29848 11.9992 4.66667 11.9992H9.37115C9.39967 11.9992 9.42745 11.99 9.45039 11.9731L16.4463 6.80363C16.8863 6.47845 17.5091 6.79262 17.5091 7.3398L17.5091 24.6595Z" fill="currentColor" />
                                            <path d="M27.5091 9.33336C27.8773 9.33336 28.1758 9.63184 28.1758 10V22C28.1758 22.3682 27.8773 22.6667 27.5091 22.6667H26.1758C25.8076 22.6667 25.5091 22.3682 25.5091 22V10C25.5091 9.63184 25.8076 9.33336 26.1758 9.33336L27.5091 9.33336Z" fill="currentColor" />
                                            <path d="M22.1758 12C22.544 12 22.8424 12.2985 22.8424 12.6667V19.3334C22.8424 19.7016 22.544 20 22.1758 20H20.8424C20.4743 20 20.1758 19.7016 20.1758 19.3334V12.6667C20.1758 12.2985 20.4743 12 20.8424 12H22.1758Z" fill="currentColor" />
                                            <path d="M17.5091 24.6595C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9992 9.36923 19.9992H4.66667C4.29848 19.9992 4 19.7007 4 19.3325V12.6658C4 12.2976 4.29848 11.9992 4.66667 11.9992H9.37115C9.39967 11.9992 9.42745 11.99 9.45039 11.9731L16.4463 6.80363C16.8863 6.47845 17.5091 6.79262 17.5091 7.3398L17.5091 24.6595Z" fill="currentColor" />
                                            <path d="M27.5091 9.33336C27.8773 9.33336 28.1758 9.63184 28.1758 10V22C28.1758 22.3682 27.8773 22.6667 27.5091 22.6667H26.1758C25.8076 22.6667 25.5091 22.3682 25.5091 22V10C25.5091 9.63184 25.8076 9.33336 26.1758 9.33336L27.5091 9.33336Z" fill="currentColor" />
                                            <path d="M22.1758 12C22.544 12 22.8424 12.2985 22.8424 12.6667V19.3334C22.8424 19.7016 22.544 20 22.1758 20H20.8424C20.4743 20 20.1758 19.7016 20.1758 19.3334V12.6667C20.1758 12.2985 20.4743 12 20.8424 12H22.1758Z" fill="currentColor" />
                                        </svg>
                                        <svg slot="volume-low" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...({} as any)}>
                                            <path d="M17.5091 24.6594C17.5091 25.2066 16.8864 25.5207 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3324V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.80358C16.8863 6.4784 17.5091 6.79258 17.5091 7.33975L17.5091 24.6594Z" fill="currentColor" />
                                            <path d="M22.8424 12.6667C22.8424 12.2985 22.544 12 22.1758 12H20.8424C20.4743 12 20.1758 12.2985 20.1758 12.6667V19.3333C20.1758 19.7015 20.4743 20 20.8424 20H22.1758C22.544 20 22.8424 19.7015 22.8424 19.3333V12.6667Z" fill="currentColor" />
                                            <path d="M17.5091 24.6594C17.5091 25.2066 16.8864 25.5207 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3324V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.80358C16.8863 6.4784 17.5091 6.79258 17.5091 7.33975L17.5091 24.6594Z" fill="currentColor" />
                                            <path d="M22.8424 12.6667C22.8424 12.2985 22.544 12 22.1758 12H20.8424C20.4743 12 20.1758 12.2985 20.1758 12.6667V19.3333C20.1758 19.7015 20.4743 20 20.8424 20H22.1758C22.544 20 22.8424 19.7015 22.8424 19.3333V12.6667Z" fill="currentColor" />
                                        </svg>
                                        <svg slot="volume-muted" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...({} as any)}>
                                            <path d="M17.5091 24.6594C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3325V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.8036C16.8863 6.47842 17.5091 6.79259 17.5091 7.33977L17.5091 24.6594Z" fill="currentColor" />
                                            <path d="M28.8621 13.6422C29.1225 13.3818 29.1225 12.9597 28.8621 12.6994L27.9193 11.7566C27.659 11.4962 27.2368 11.4962 26.9765 11.7566L24.7134 14.0197C24.6613 14.0717 24.5769 14.0717 24.5248 14.0197L22.262 11.7568C22.0016 11.4964 21.5795 11.4964 21.3191 11.7568L20.3763 12.6996C20.116 12.9599 20.116 13.382 20.3763 13.6424L22.6392 15.9053C22.6913 15.9573 22.6913 16.0418 22.6392 16.0938L20.3768 18.3562C20.1165 18.6166 20.1165 19.0387 20.3768 19.299L21.3196 20.2419C21.58 20.5022 22.0021 20.5022 22.2624 20.2418L24.5248 17.9795C24.5769 17.9274 24.6613 17.9274 24.7134 17.9795L26.976 20.2421C27.2363 20.5024 27.6585 20.5024 27.9188 20.2421L28.8616 19.2992C29.122 19.0389 29.122 18.6168 28.8616 18.3564L26.599 16.0938C26.547 16.0418 26.547 15.9573 26.599 15.9053L28.8621 13.6422Z" fill="currentColor" />
                                            <path d="M17.5091 24.6594C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3325V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.8036C16.8863 6.47842 17.5091 6.79259 17.5091 7.33977L17.5091 24.6594Z" fill="currentColor" />
                                            <path d="M28.8621 13.6422C29.1225 13.3818 29.1225 12.9597 28.8621 12.6994L27.9193 11.7566C27.659 11.4962 27.2368 11.4962 26.9765 11.7566L24.7134 14.0197C24.6613 14.0717 24.5769 14.0717 24.5248 14.0197L22.262 11.7568C22.0016 11.4964 21.5795 11.4964 21.3191 11.7568L20.3763 12.6996C20.116 12.9599 20.116 13.382 20.3763 13.6424L22.6392 15.9053C22.6913 15.9573 22.6913 16.0418 22.6392 16.0938L20.3768 18.3562C20.1165 18.6166 20.1165 19.0387 20.3768 19.299L21.3196 20.2419C21.58 20.5022 22.0021 20.5022 22.2624 20.2418L24.5248 17.9795C24.5769 17.9274 24.6613 17.9274 24.7134 17.9795L26.976 20.2421C27.2363 20.5024 27.6585 20.5024 27.9188 20.2421L28.8616 19.2992C29.122 19.0389 29.122 18.6168 28.8616 18.3564L26.599 16.0938C26.547 16.0418 26.547 15.9573 26.599 15.9053L28.8621 13.6422Z" fill="currentColor" />
                                        </svg>
                                        <MediaTooltip position="top center">
                                            <span slot="mute">Unmute</span>
                                            <span slot="unmute">Mute</span>
                                        </MediaTooltip>
                                    </MediaMuteButton>
                                    <MediaVolumeSlider className="group mx-[calc(var(--thumb-size)/2)] h-12 hidden sm:flex items-center transition-all duration-200 ease-in-out min-w-[5vw]" style={{ '--thumb-size': '14px', '--track-height': '4px' }}>
                                        <div className="absolute top-1/2 left-0 z-0 h-[var(--track-height)] w-full -translate-y-1/2 transform bg-[#5a595a] outline-none group-data-[focus]:ring-4 group-data-[focus]:ring-blue-400"></div>
                                        <div className="absolute top-1/2 left-0 z-20 h-[var(--track-height)] w-full -translate-y-1/2 scale-x-[var(--slider-fill-rate)] transform bg-white will-change-transform" style={{ transformOrigin: 'left center' }} />
                                        <div className="absolute top-0 left-[var(--slider-fill-percent)] z-20 h-full w-[var(--thumb-size)] -translate-x-1/2 transform group-data-[dragging]:left-[var(--slider-pointer-percent)]">
                                            <div className="absolute top-1/2 left-0 h-[var(--thumb-size)] w-[var(--thumb-size)] -translate-y-1/2 transform rounded-full bg-white opacity-0 transition-opacity duration-150 ease-in group-data-[interactive]:opacity-100"></div>
                                        </div>
                                        <div className="absolute top-[var(--preview-top)] left-[var(--preview-left)] flex -translate-x-1/2 transform items-center justify-center rounded-sm bg-black px-2.5 py-1 text-white/80 opacity-0 transition-opacity duration-200 ease-out group-data-[interactive]:opacity-100 group-data-[interactive]:ease-in" slot="preview">
                                            <MediaSliderValue type="pointer" format="percent" />
                                        </div>
                                    </MediaVolumeSlider>
                                </div>
                            </div>
                            <div className={`${styles.ui ?? ""} flex flex-row justify-center items-center m-0 z-30 w-[95%]`}>
                                <MediaTimeSlider
                                    className={`group flex items-center w-full ${styles.timeSlider ?? ""} z-[999]`}
                                    trackClass="group-hover:h-[13px]"
                                    thumbClass={`w-4 h-4 ${styles.thumb ?? ""}`}
                                    keyStep={5}
                                    shiftKeyMultiplier={2}
                                >
                                    <div slot="preview">
                                        <MediaSliderThumbnail />
                                        <MediaSliderValue type="pointer" format="time" showHours padMinutes padHours />
                                    </div>
                                </MediaTimeSlider>
                            </div>
                            <div className={`${styles.ui ?? ""} flex flex-row justify-center items-center`}>
                                <div className="hidden sm:flex flex-row justify-center items-center text-white font-bold">
                                    <MediaTime type="current"></MediaTime>/<MediaTime type="duration"></MediaTime>
                                </div>
                                <div className="flex center justify-center items-center h-[35px] transition-all duration-200 hover:bg-[hsla(0,0%,76%,.2)] rounded-md">
                                    <MediaFullscreenButton aria-keyshortcuts="f" defaultAppearance>
                                        <MediaTooltip position="top center">
                                            <span slot="enter">Fullscreen</span>
                                            <span slot="exit">Exit Fullscreen</span>
                                        </MediaTooltip>
                                    </MediaFullscreenButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </MediaPlayer>
            </main>
        </>
    );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id: string | string[] | undefined = context.params?.id;
    let provider: string | string[] | undefined = context.params?.provider;
    const watchId: string | string[] | undefined = context.params?.watchId;
    const subDub: string | string[] | undefined = context.params?.subDub;

    if (!Array.isArray(provider) && provider?.toLowerCase().includes("dub")) {
        provider = "gogoanime";
    }

    if (!id || !provider || !watchId || !subDub) return { notFound: true };

    let episodeNumber = -1;

    const media = (await axios.get(String(env.BACKEND_URL) + "/info/" + String(id) + "?apikey=" + String(env.API_KEY))).data as Anime;
    const content = (await axios.get(String(env.BACKEND_URL) + "/episodes/" + String(id) + "?apikey=" + String(env.API_KEY))).data as EpisodeData[];
    const episodeCovers = await (await axios.get(`${env.BACKEND_URL}/episode-covers?id=${String(id)}&apikey=${env.API_KEY}`)).data as { episode: number, img: string }[];

    for (let i = 0; i < content.length; i++) {
        const episodes = (content)[i]?.episodes ?? [];
        for (let j = 0; j < episodes.length; j++) {
            const episodeNumber = (episodes[j]?.number ?? 0);
            for (let k = 0; k < episodeCovers.length; k++) {
                if (episodeCovers[k]?.episode === episodeNumber) {
                    if (!episodes[j]?.img) {
                        Object.assign((content)[i]?.episodes[j] ?? {}, { img: episodeCovers[k]?.img });
                    }
                    break;
                }
            }
        }
    }

    const episodeSelector = [];
    
    for (let i = 0; i < content.length; i++) {
        const providerEpisodes = content[i];
        for (let j = 0; j < (providerEpisodes?.episodes ?? []).length; j++) {
            const episode = providerEpisodes?.episodes[j];
            if (episode?.id === watchId) {
                episodeNumber = episode.number ?? i;
            }

            if (providerEpisodes?.providerId.toLowerCase() === (provider as string).toLowerCase()) {
                const title = episode?.title;
                
                if (subDub === "dub") {
                    if (episode?.hasDub) {
                        episodeSelector.push({
                            title: title ?? "Episode " + String(i + 1),
                            number: episode.number ?? i + 1,
                            length: capitalize(providerEpisodes.providerId),
                            url: `/watch/${id as string}/${provider as string}/${encodeURIComponent(episode.id)}/dub`,
                            selected: episode?.id === watchId
                        })
                    }
                } else {
                    episodeSelector.push({
                        title: title ?? "Episode " + String(i + 1),
                        number: episode?.number ?? i + 1,
                        length: capitalize(providerEpisodes.providerId),
                        url: `/watch/${id as string}/${provider as string}/${encodeURIComponent(episode?.id ?? "")}/sub`,
                        selected: episode?.id === watchId
                    })
                }
            }
        }
    }

    const sources = (await axios.post(String(env.BACKEND_URL) + "/sources?apikey=" + String(env.API_KEY), {
        id: id,
        providerId: provider,
        watchId: watchId,
        subType: subDub,
        episodeNumber: episodeNumber > 0 ? episodeNumber : -1
    }).catch((err) => {
        console.error(err);
        return {
            data: {
                sources: [],
                subtitles: [],
                intro: {
                    start: 0,
                    end: 0
                },
                outro: {
                    start: 0,
                    end: 0
                }
            }
        }
    })).data as Source;

    for (let i = 0; i < sources?.sources.length; i++) {
        if (sources.headers && Object.keys(sources.headers).length > 0) {
            //console.log(`${String(env.M3U8_PROXY)}/proxy/m3u8/${encodeURIComponent(String(sources.sources[i]?.url))}/${encodeURIComponent(JSON.stringify(sources.headers))}`);
            Object.assign(sources.sources[i] ?? {}, { url: `${String(env.M3U8_PROXY)}/proxy/m3u8/${encodeURIComponent(String(sources.sources[i]?.url))}/${encodeURIComponent(JSON.stringify(sources.headers))}` })
        }
    }

    const subtitles = [];

    subtitles.push({
        text: "Styling",
        iconID: "fillIcon",
        open: "subStyle",
    });

    const languageNames = new Intl.DisplayNames(["en"], {
        type: "language",
    });

    let thumbnails = "";

    sources?.subtitles.map((subtitle) => {
        const langCode: string | undefined = subtitle.lang.split("-")[0];

        let language: string | undefined = "Unknown";

        if (subtitle.lang?.toLowerCase() === "thumbnails") {
            thumbnails = `${String(env.M3U8_PROXY)}/${subtitle.url}`;
            return;
        }

        try {
            language = languageNames.of(langCode ?? "");
        
            subtitles.push({
                text: capitalize(language ?? ""),
                highlightable: true,
                url: subtitle.url,
                selected: subtitle.lang == "en-US" ? true : false,
            });
        } catch (e) {
            //
        }
    })

    return {
        props: {
            media,
            episodes: content,
            episodeSelector,
            episodeNumber,
            sources,
            subtitles,
            provider,
            watchId,
            thumbnails,
            subDub
        },
    };
};

export default Watch;

interface Props {
    media: Anime;
    episodes: EpisodeData[];
    episodeSelector: {
        title: string;
        number: number;
        length: string;
        url: string;
        selected: boolean;
    }[];
    episodeNumber: number;
    sources: Source;
    subtitles: {
        text: string;
        iconID?: string;
        open?: string;
        url?: string;
        selected?: boolean;
        highlightable?: boolean;
    }[];
    provider: string;
    watchId: string;
    thumbnails: string;
    subDub: string;
}
