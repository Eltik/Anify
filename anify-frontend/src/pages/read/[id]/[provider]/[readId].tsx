/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { type NextPage, type GetServerSideProps } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsPanel } from "~/components/settingsPanel";
import { env } from "~/env.mjs";
import { type Page, type ChapterData, type Manga, Format, type MixdropResponse, type ReadHistory } from "~/types";
import { ChaptersPanel } from "~/components/chaptersPanel";
import { MangaPage } from "~/components/page";
import Head from "next/head";
import { useFontSize, useFontWidth, useHeaderBackground, usePageSize, useReadHistory } from "~/store/store";
import { useStore } from "zustand";

const Read: NextPage<Props> = ({ chapterNumber, chapterSelector, chapters, downloadLink, mixdrop, media, nextChapter, pages, previousChapter, readId, provider }) => {
    const [showNavbar, setShowNavbar] = useState(true);
    const [prevScrollPos, setPrevScrollPos] = useState(0);

    const [open, setOpen] = useState(false);
    const [showChapters, setShowChapters] = useState(false);

    const fontSize = useStore(useFontSize, ((state: any) => state.fontSize as string));
    const pageSize = useStore(usePageSize, ((state: any) => state.pageSize as string));
    const fontWidth = useStore(useFontWidth, ((state: any) => state.fontWidth as string));
    const headerBackground = useStore(useHeaderBackground, ((state: any) => state.headerBackground as boolean));

    const readHistory = useStore(useReadHistory, ((state: any) => state.readHistory as ReadHistory[]));

    const updateSize = (fontSize: string, lineHeight: string) => {
        useFontSize.setState({ fontSize: `${fontSize} ${lineHeight}` })
        
        document.documentElement.style.setProperty("--font-size", fontSize);
        document.documentElement.style.setProperty("--font-height", lineHeight);
    };

    const updatePageSize = (value?: string) => {
        usePageSize.setState({ pageSize: value ?? pageSize })
        
        document.documentElement.style.setProperty("--page-size", value ?? "");
    };

    const updateWidth = (value?: string) => {
        useFontWidth.setState({ fontWidth: value ?? fontWidth })
        
        document.documentElement.style.setProperty("--font-weight", value ?? "");
    };

    const updateHeader = (value?: boolean) => {
        useHeaderBackground.setState({ headerBackground: value })
        
        const header: HTMLElement | null = document.querySelector(".header");
        if (header) {
            if (value) {
                header.classList.add("bg-[#181818d2]");
                header.style.backdropFilter = "saturate(180%) blur(10px)";
                (header.style as any)["-webkit-backdrop-filter"] = "saturate(180%) blur(10px)";
            } else {
                header.classList.remove("bg-[#181818d2]");
                header.style.backdropFilter = "";
                (header.style as any)["-webkit-backdrop-filter"] = "";
            }
        }
    };

    useEffect(() => {
        updateSize(fontSize?.split(" ")[0] ?? "", fontSize?.split(" ")[1] ?? "");
        updateWidth(fontWidth);
        updateHeader(headerBackground);

        let currentReadHistory: number | undefined = undefined;

        for (let i = 0; i < (readHistory ?? []).length; i++) {
            if (readHistory?.[i]?.chapterNumber != chapterNumber && readHistory?.[i]?.mediaId === media.id) {
                readHistory?.splice(i, 1);
            }
        }
        
        for (let i = 0; i < (readHistory ?? []).length; i++) {
            if (readHistory?.[i]?.chapterNumber === chapterNumber && readHistory?.[i]?.mediaId === media.id) {
                currentReadHistory = i;
            }
        }

        if (currentReadHistory === undefined) {
            const newReadHistory = {
                chapterNumber,
                mediaId: media.id,
                coverImage: media.coverImage ?? "",
                title: media.title,
                readId,
                providerId: provider,
                format: media.format
            } as ReadHistory;

            currentReadHistory = readHistory?.length;

            readHistory?.unshift(newReadHistory);
        } else {
            const temp = readHistory?.[currentReadHistory];
            readHistory?.splice(currentReadHistory, 1);

            Object.assign(temp ?? {}, {
                chapterNumber,
                mediaId: media.id,
                coverImage: media.coverImage ?? "",
                title: media.title,
                readId,
                providerId: provider,
                format: media.format
            });
            
            temp ? readHistory?.unshift(temp) : null;
        }
        
        useReadHistory.setState({ readHistory });

        const handleScroll = () => {
            const currentScrollPos = window.pageYOffset;
            setShowNavbar(prevScrollPos > currentScrollPos || currentScrollPos <= 0);
            setPrevScrollPos(currentScrollPos);
        };

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [prevScrollPos]);
    
    return (
        <>
        <Head>
            <title>{"Chapter " + String(chapterNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")}</title>
            <meta name="title" content={"Chapter " + String(chapterNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")} />
            <meta name="description" content={"Find new series to read and share with your friends with ease with high quality scanlations."} />

            <meta property="og:type" content="website" />
            <meta property="og:url" content={`https://anify.tv/read/${media.id}/${provider}/${encodeURIComponent(readId)}`} />
            <meta property="og:title" content={"Chapter " + String(chapterNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")} />
            <meta property="og:description" content={"Find new series to read and share with your friends with ease with high quality scanlations."} />
            <meta property="og:image" content={"https://anify.tv/api/info?id=" + media.id} />

            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={`https://anify.tv/read/${media.id}/${provider}/${encodeURIComponent(readId)}`} />
            <meta property="twitter:title" content={"Chapter " + String(chapterNumber) + " - " + (media.title.english ?? media.title.romaji ?? media.title.native ?? "")} />
            <meta property="twitter:description" content={"Find new series to read and share with your friends with ease with high quality scanlations."} />
            <meta property="twitter:image" content={"https://anify.tv/api/info?id=" + media.id} />
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className="flex flex-col">
            {media.format === Format.NOVEL ? (
                <div>
                    <div className={`flex flex-row fixed w-[100vw] pt-[5px] justify-between items-center bg-[#181818d2] z-10 header transition-all duration-200 ease-in-out ${!showNavbar ? "opacity-0 -translate-y-5" : "opacity-100 translate-y-0"}`} style={{
                        backdropFilter: "saturate(180%) blur(8px)",
                        WebkitBackdropFilter: "saturate(180%) blur(8px)",
                    }}>
                        <div className="flex flex-row justify-start items-center w-full">
                            <Link href={`/info/${media.id}`} className="w-[40px] h-[40px] mt-[5px] ml-[10px] cursor-pointer stroke-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" className="transition-all decoration-neutral-150 ease-linear"><path stroke="inherit" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="3" d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08"></path></svg>
                            </Link>
                        </div>
                        <div className="text-xl md:text-2xl leading-0 line-clamp-3 sm:line-clamp-2 overflow-hidden"></div>
                        <div className="flex flex-row justify-center items-center gap-1 text-white">
                            <div className="flex flex-row justify-center items-center w-full">
                                <div className="flex flex-row-reverse gap-1">
                                    <Link href={previousChapter} rel="noopener nofollow noreferrer" className="rounded relative bg-zinc-600 text-white pointer flex items-center overflow-hidden accent !px-0 min-h-[2rem] min-w-[2rem] transition-all duration-200 hover:bg-background-light">
                                        <span className="flex relative items-center font-medium select-none w-full pointer-events-none justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="feather feather-chevron-right icon" viewBox="0 0 24 24">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </span>
                                    </Link>
                                    <Link href={nextChapter} rel="noopener nofollow noreferrer" className="rounded relative bg-zinc-600 text-white pointer flex items-center overflow-hidden accent !px-0 min-h-[2rem] min-w-[2rem] transition-all duration-200 hover:bg-background-light">
                                        <span className="flex relative items-center justify-center font-medium select-none w-full pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="feather feather-chevron-left icon" viewBox="0 0 24 24">
                                                <path d="m15 18-6-6 6-6"></path>
                                            </svg>
                                        </span>
                                    </Link>
                                </div>
                            </div>
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
                                                    html: "<div style='color: white'>Font Size</div>",
                                                    iconID: "fontSizeIcon",
                                                    open: "size",
                                                },
                                                {
                                                    html: "<div style='color: white'>Font Width</div>",
                                                    iconID: "fontWidthIcon",
                                                    open: "width",
                                                },
                                                {
                                                    html: "<div style='color: white'>Settings</div>",
                                                    iconID: "configIcon",
                                                    open: "config",
                                                },
                                            ],
                                        },
                                        {
                                            id: "size",
                                            selectableScene: true,
                                            heading: {
                                                html: "<div style='color: white'>Font Size</div>",
                                                open: "size",
                                                hideSubArrow: true,
                                            },
                                            items: [
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Small</div>`,
                                                    callback: () => updateSize("0.875rem", "1.25rem"),
                                                    highlightable: true,
                                                    selected: fontSize === "0.875rem 1.25rem",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Base</div>`,
                                                    callback: () => updateSize("1rem", "1.5rem"),
                                                    highlightable: true,
                                                    selected: fontSize === "1rem 1.5rem",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Large</div>`,
                                                    callback: () => updateSize("1.125rem", "1.75rem"),
                                                    highlightable: true,
                                                    selected: fontSize === "1.125rem 1.75rem",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> XL</div>`,
                                                    callback: () => updateSize("1.25rem", "1.75rem"),
                                                    highlightable: true,
                                                    selected: fontSize === "1.25rem 1.75rem",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 4XL</div>`,
                                                    callback: () => updateSize("2.25rem", "2.5rem"),
                                                    highlightable: true,
                                                    selected: fontSize === "2.25rem 2.5rem",
                                                },
                                            ],
                                        },
                                        {
                                            id: "width",
                                            selectableScene: true,
                                            heading: {
                                                html: "<div style='color: white'>Font Width</div>",
                                                open: "width",
                                                hideSubArrow: true,
                                            },
                                            items: [
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Thin</div>`,
                                                    callback: () => updateWidth("100"),
                                                    highlightable: true,
                                                    selected: fontWidth === "100",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Extra-light</div>`,
                                                    callback: () => updateWidth("200"),
                                                    highlightable: true,
                                                    selected: fontWidth === "200",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Light</div>`,
                                                    callback: () => updateWidth("300"),
                                                    highlightable: true,
                                                    selected: fontWidth === "300",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Normal</div>`,
                                                    callback: () => updateWidth("400"),
                                                    highlightable: true,
                                                    selected: fontWidth === "400",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Medium</div>`,
                                                    callback: () => updateWidth("500"),
                                                    highlightable: true,
                                                    selected: fontWidth === "500",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Semi-bold</div>`,
                                                    callback: () => updateWidth("600"),
                                                    highlightable: true,
                                                    selected: fontWidth === "600",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Bold</div>`,
                                                    callback: () => updateWidth("700"),
                                                    highlightable: true,
                                                    selected: fontWidth === "700",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Extra Bold</div>`,
                                                    callback: () => updateWidth("800"),
                                                    highlightable: true,
                                                    selected: fontWidth === "800",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Black</div>`,
                                                    callback: () => updateWidth("900"),
                                                    highlightable: true,
                                                    selected: fontWidth === "900",
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
                                                    html: '<h3 class="qualityText" id="auto-next">Header Background</h3>',
                                                    customId: "header",
                                                    toggle: true,
                                                    toggleOn: () => updateHeader(true),
                                                    toggleOff: () => updateHeader(false),
                                                    on: headerBackground
                                                }
                                            ],
                                        },
                                    ]
                                }
                            />
                            <ChaptersPanel
                                contentSelector={chapterSelector}
                                showChapters={showChapters}
                            />
                        </div>
                    </div>
                    <div className={`flex flex-col w-[90%] md:w-[40%] mt-5 mx-auto ${open || showChapters ? "opacity-50 blur-sm" : "opacity-100 blur-none"} transition-all duration-200 z-0`}>
                        <br />
                        <div dangerouslySetInnerHTML={{
                            __html: pages as string
                        }} className={`text-lg mt-5 text-white font-extralight text-justify md:text-left bg-[var(--bg-color)]`} style={{
                            fontSize: "var(--font-size)",
                            lineHeight: "var(--font-height)",
                            fontWeight: "var(--font-weight)",
                        }}></div>
                        <span className="text-white text-lg">
                            {provider === "JNovels" ? "No data available! Visit the open tab to download the novel. If you can't see it, please allow pop-ups and refresh the page." : ""}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="w-full">
                    <div className={`flex flex-row fixed w-[100vw] pt-[5px] justify-between items-center bg-[#181818d2] z-10 header transition-all duration-200 ease-in-out ${!showNavbar ? "opacity-0 -translate-y-5" : "opacity-100 translate-y-0"}`} style={{
                        backdropFilter: "saturate(180%) blur(8px)",
                        WebkitBackdropFilter: "saturate(180%) blur(8px)",
                    }}>
                        <div className="flex flex-row justify-start items-center w-full">
                            <Link href={`/info/${media.id}`} className="w-[40px] h-[40px] mt-[5px] ml-[10px] cursor-pointer stroke-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" className="transition-all decoration-neutral-150 ease-linear"><path stroke="inherit" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="3" d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08"></path></svg>
                            </Link>
                        </div>
                        <div className="text-xl md:text-2xl leading-0 line-clamp-3 sm:line-clamp-2 overflow-hidden"></div>
                        <div className="flex flex-row justify-center items-center gap-1 text-white">
                            {downloadLink?.result[mixdrop ?? ""]?.url ? (
                                <a href={downloadLink?.result[mixdrop ?? ""]?.url ?? ""} target="_blank" className="bg-[hsla(0,0%,76%,0)] rounded-sm p-[5px] w-[32px] h-[32px] flex justify-center items-center ml-auto mr-[12px] cursor-pointer hover:bg-[hsla(0,0%,76%,.2)] transition-all duration-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                        <path d="M12 17V3"/>
                                        <path d="m6 11 6 6 6-6"/>
                                        <path d="M19 21H5"/>
                                    </svg>
                                </a>
                            ) : null}
                            <div className="flex flex-row justify-center items-center w-full">
                                <div className="flex flex-row-reverse gap-1">
                                    <Link href={previousChapter} rel="noopener nofollow noreferrer" className="rounded relative bg-zinc-600 text-white pointer flex items-center overflow-hidden accent !px-0 min-h-[2rem] min-w-[2rem] transition-all duration-200 hover:bg-background-light">
                                        <span className="flex relative items-center font-medium select-none w-full pointer-events-none justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="feather feather-chevron-right icon" viewBox="0 0 24 24">
                                                <path d="m9 18 6-6-6-6"></path>
                                            </svg>
                                        </span>
                                    </Link>
                                    <Link href={nextChapter} rel="noopener nofollow noreferrer" className="rounded relative bg-zinc-600 text-white pointer flex items-center overflow-hidden accent !px-0 min-h-[2rem] min-w-[2rem] transition-all duration-200 hover:bg-background-light">
                                        <span className="flex relative items-center justify-center font-medium select-none w-full pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="feather feather-chevron-left icon" viewBox="0 0 24 24">
                                                <path d="m15 18-6-6 6-6"></path>
                                            </svg>
                                        </span>
                                    </Link>
                                </div>
                            </div>
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
                                                    html: "<div style='color: white'>Page Size</div>",
                                                    iconID: "pageSizeIcon",
                                                    open: "size",
                                                },
                                                {
                                                    html: "<div style='color: white'>Settings</div>",
                                                    iconID: "configIcon",
                                                    open: "config",
                                                },
                                            ],
                                        },
                                        {
                                            id: "size",
                                            selectableScene: true,
                                            heading: {
                                                html: "<div style='color: white'>Page Size</div>",
                                                open: "size",
                                                hideSubArrow: true,
                                            },
                                            items: [
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 1/4</div>`,
                                                    callback: () => updatePageSize("25vw"),
                                                    highlightable: true,
                                                    selected: pageSize === "25vw",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> 1/2</div>`,
                                                    callback: () => updatePageSize("50vw"),
                                                    highlightable: true,
                                                    selected: pageSize === "50vw",
                                                },
                                                {
                                                    html: `<div class="radioItemWrapper"><div class="radioButtonOutside"><div class="radioButtonInside"></div></div> Full</div>`,
                                                    callback: () => updatePageSize("100vw"),
                                                    highlightable: true,
                                                    selected: pageSize === "100vw",
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
                                                    html: '<h3 class="qualityText" id="auto-next">Header Background</h3>',
                                                    customId: "header",
                                                    toggle: true,
                                                    toggleOn: () => updateHeader(true),
                                                    toggleOff: () => updateHeader(false),
                                                    on: headerBackground
                                                }
                                            ],
                                        },
                                    ]
                                }
                            />
                            <ChaptersPanel
                                contentSelector={chapterSelector}
                                showChapters={showChapters}
                            />
                        </div>
                    </div>
                    <div className="mt-10 flex flex-col">
                        {pages && typeof pages !== "string" && pages.length > 0 ? pages.map((page, index) => (
                            <MangaPage source={page.url} key={index} />
                        )) : (
                            <div className="flex flex-col justify-center items-center">
                                <br />
                                <br />
                                <div className="text-4xl text-white">No pages found</div>
                                <div className="text-white">Please try a different connector. If this is a bug, please join our <Link href="/discord" className="text-main-text transition-all duration-200 hover:text-main">Discord</Link> and report it.</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id: string | string[] | undefined = context.params?.id;
    const provider: string | string[] | undefined = context.params?.provider;
    const readId: string | string[] | undefined = context.params?.readId;

    if (!id || !provider || !readId) return { notFound: true };

    const media = (await axios.get(String(env.BACKEND_URL) + "/info/" + String(id) + "?apikey=" + String(env.API_KEY))).data as Manga;
    const content = (await axios.get(String(env.BACKEND_URL) + "/chapters/" + String(id) + "?apikey=" + String(env.API_KEY))).data as ChapterData[];

    let mixdrop = "";
    for (const prov of content) {
        if (prov.providerId === provider) {
            for (const chapter of prov.chapters) {
                if (chapter.id === readId) mixdrop = chapter.mixdrop ?? "";
            }
        }
    }

    let downloadLink: MixdropResponse | null = null;

    if (mixdrop) {
        downloadLink = await (await axios.post(String(env.BACKEND_URL) + "/pages-download?apikey=" + String(env.API_KEY), {
            id: mixdrop
        })).data as MixdropResponse;
    }

    content.reverse();

    let nextChapter = "";
    let previousChapter = "";
    let chapterNumber = -1;
    let chapterTitle = "";

    const chapterSelector = [];

    for (let i = 0; i < content.length; i++) {
        const providerChap = content[i];
        for (let j = 0; j < (providerChap?.chapters ?? []).length; j++) {
            const chapter = providerChap?.chapters[j];

            if (chapter?.id === readId) {
                chapterTitle = chapter?.title ?? "";
                chapterNumber = chapter.number ?? i;
            }
            if (providerChap?.providerId.toLowerCase() === (provider as string).toLowerCase()) {
                const title = chapter?.title;
                chapterSelector.push({
                    title: title ?? "Chapter " + String(i + 1),
                    number: chapter?.number,
                    length: providerChap?.providerId,
                    url: `/read/${id as string ?? ""}/${provider as string ?? ""}/${encodeURIComponent(chapter?.id ?? "")}`,
                    selected: chapter?.id === readId,
                });
                if (chapter?.id === readId) {
                    if (j < providerChap.chapters.length - 1) {
                        nextChapter = `/read/${id as string ?? ""}/${provider as string ?? ""}/${encodeURIComponent(
                            providerChap.chapters[j + 1]?.id ?? readId
                        )}`;
                    } else {
                        nextChapter = `/read/${id as string ?? ""}/${provider as string ?? ""}/${encodeURIComponent(
                            readId
                        )}`;
                    }
                    if (j > 0) {
                        previousChapter = `/read/${id as string ?? ""}/${provider as string ?? ""}/${encodeURIComponent(
                            providerChap.chapters[j - 1]?.id ?? readId
                        )}`;
                    } else {
                        previousChapter = `/read/${id as string ?? ""}/${provider as string ?? ""}/${encodeURIComponent(
                            readId
                        )}`;
                    }
                }
            }
        }
    }

    const pages = await (await axios.post(String(env.BACKEND_URL) + "/pages?apikey=" + String(env.API_KEY), {
        chapterNumber,
        providerId: provider,
        readId,
        id
    })).data as Page[];

    if (media.format !== "NOVEL") {
        for (let i = 0; i < pages.length; i++) {
            if (pages[i]?.headers && Object.keys(pages[i]?.headers ?? {}).length > 0) {
                Object.assign(pages[i] ?? {}, { url: `${String(env.IMAGE_PROXY)}?url=${encodeURIComponent(String(pages[i]?.url))}&headers=${encodeURIComponent(JSON.stringify(pages[i]?.headers))}` })
            }
        }
    }

    return {
        props: {
            media,
            chapters: content,
            chapterSelector,
            chapterNumber,
            pages,
            nextChapter,
            previousChapter,
            readId,
            provider: provider as string,
            mixdrop,
            downloadLink
        }
    }
}

export default Read;

interface Props {
    media: Manga;
    chapters: ChapterData[];
    chapterSelector: {
        title: string;
        number: number;
        length: string;
        url: string;
        selected: boolean;
    }[];
    chapterNumber: number;
    pages: Page[] | string;
    nextChapter: string;
    previousChapter: string;
    readId: string;
    provider: string;
    mixdrop: string | null;
    downloadLink: MixdropResponse | null;
}