/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useEffect, useRef, useState } from "react";
import { type SearchResult } from "~/pages/api/search";
import SearchItem from "./searchItem";
import { Format, type UserData } from "~/types";
import Link from "next/link";
import { useUserData } from "~/store/store";
import { useStore } from "zustand";
import Select, { type MultiValue } from "react-select";

function Navbar({ active }: { active: "home" | "anime" | "manga" | "novel" }) {
    const [modelOpen, setModelOpen] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [searchData, setSearch] = useState<SearchResult | null>(null);

    const [searchType, setSearchType] = useState(active === "home" ? "anime" : active === "novel" ? "manga" : active);
    const [searchFormats, setSearchFormats] = useState(active === "novel" ? [Format.NOVEL] : active === "manga" ? [Format.MANGA, Format.ONE_SHOT] : []);
    const [searchGenres, setSearchGenres] = useState(["None"]);

    const [showNavbar, setShowNavbar] = useState(true);
    const [prevScrollPos, setPrevScrollPos] = useState(0);

    const userData = useStore(useUserData, (state: any) => state.userData as UserData);

    const inputRef = useRef(null);

    useEffect(() => {
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

    let timeout: NodeJS.Timeout | null = null;

    function search(e: React.KeyboardEvent<HTMLInputElement>) {
        const input = e.currentTarget.value;
        const valid = e.key.match(/^[a-zA-Z0-9 ]*$/);
        if (!valid || e.key === "Backspace" || e.key === "Shift" || e.key === "Meta" || e.key === "Alt" || e.key === "Control" || e.key === "Tab") return;

        setRequesting(true);
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(function () {
            if (input != undefined && input.length > 0) {
                void searchRequest(input);
            } else {
                setRequesting(false);
                setSearch(null);
            }
        }, 1000);
    }

    async function searchRequest(query: string) {
        setRequesting(true);
        const args = {
            query: query,
            type: searchType,
            formats: searchFormats,
            genres: searchGenres.includes("None") ? [] : searchGenres,
        };

        try {
            const req = await fetch("/api/search", { method: "POST", body: JSON.stringify(args), headers: { "Content-Type": "application/json" } });
            if (!req.ok) {
                setRequesting(false);
                setSearch({
                    hits: [],
                    estimatedTotalHits: 0,
                    limit: 0,
                    offset: 0,
                    processingTimeMs: 0,
                    query: "ERROR",
                });
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const data: SearchResult = await req.json();

            setRequesting(false);
            setSearch(data);
        } catch (e) {
            setRequesting(false);
            setSearch(null);
        }
    }

    const searchSelector = [
        { value: 0, label: "Anime" },
        { value: 1, label: "Manga" },
        { value: 2, label: "Novel" },
    ];

    const updateSearchSelector = (data: { value: number; label: string } | null) => {
        if (data?.value === 0) {
            setSearchType("anime");
            setSearchFormats([]);
        }
        if (data?.value === 1) {
            setSearchType("manga");
            setSearchFormats([Format.MANGA, Format.ONE_SHOT]);
        }
        if (data?.value === 2) {
            setSearchType("manga");
            setSearchFormats([...searchFormats, Format.NOVEL]);
        }
    };

    const genresSelector = [
        { value: 0, label: "None" },
        { value: 1, label: "Action" },
        { value: 2, label: "Adventure" },
        { value: 3, label: "Anime Influenced" },
        { value: 4, label: "Avant Garde" },
        { value: 5, label: "Award Winning" },
        { value: 6, label: "Boys Love" },
        { value: 7, label: "Cars" },
        { value: 8, label: "Comedy" },
        { value: 9, label: "Dementia" },
        { value: 10, label: "Drama" },
        { value: 11, label: "Ecchi" },
        { value: 12, label: "Family" },
        { value: 13, label: "Fantasy" },
        { value: 14, label: "Food" },
        { value: 15, label: "Friendship" },
        { value: 16, label: "Game" },
        { value: 17, label: "Girls Love" },
        { value: 18, label: "Gore" },
        { value: 19, label: "Gourmet" },
        { value: 20, label: "Harem" },
        { value: 21, label: "Historical" },
        { value: 22, label: "Horror" },
        { value: 23, label: "Isekai" },
        { value: 24, label: "Kids" },
        { value: 25, label: "Magic" },
        { value: 26, label: "Mahou Shoujo" },
        { value: 27, label: "Martial Arts" },
        { value: 28, label: "Mecha" },
        { value: 29, label: "Medical" },
        { value: 30, label: "Military" },
        { value: 31, label: "Music" },
        { value: 32, label: "Mystery" },
        { value: 33, label: "Parody" },
        { value: 34, label: "Police" },
        { value: 35, label: "Political" },
        { value: 36, label: "Psychological" },
        { value: 37, label: "Racing" },
        { value: 38, label: "Romance" },
        { value: 39, label: "Samurai" },
        { value: 40, label: "School" },
        { value: 41, label: "Sci-Fi" },
        { value: 42, label: "Shoujo Ai" },
        { value: 43, label: "Shounen AI" },
        { value: 44, label: "Slice of Life" },
        { value: 45, label: "Space" },
        { value: 46, label: "Sports" },
        { value: 47, label: "Super Power" },
        { value: 48, label: "Supernatural" },
        { value: 49, label: "Suspense" },
        { value: 50, label: "Thriller" },
        { value: 51, label: "Vampire" },
        { value: 52, label: "Workplace" },
        { value: 53, label: "Yaoi" },
        { value: 54, label: "Yuri" },
        { value: 55, label: "Zombies" },
    ];

    const updateGenresSelector = (data: MultiValue<{ value: number; label: string }> | null) => {
        setSearchGenres(data?.map((item) => item.label) ?? []);
    };

    return (
        <>
            <nav
                className={`fixed right-0 top-0 z-50 flex w-full flex-col space-y-4 bg-main-primary/10 px-2 py-2 shadow-xl transition-all duration-200 ease-out sm:px-5 lg:px-0 lg:pr-5 ${!showNavbar ? "-translate-y-5 opacity-0" : "translate-y-0 opacity-100"}`}
                style={{
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                }}
            >
                <div className="grid grid-cols-3 items-center gap-4">
                    <div className="flex flex-none items-center justify-between">
                        <section className="flex items-center gap-6 lg:px-6">
                            <h3 className="text-lg font-bold text-white sm:text-2xl md:pl-20">Anify</h3>
                        </section>
                    </div>
                    <div className="ml-5 flex-auto place-self-center sm:ml-0">
                        <div className="relative">
                            <span className="absolute left-2 top-2/4 flex -translate-y-2/4 transform text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                            </span>
                            <input
                                className="input !variant-soft-primary flex rounded-full !border-none bg-main-primary/10 py-2 outline-none transition-all duration-200 ease-in-out placeholder:text-center md:w-[45vw] lg:w-[25vw]"
                                type="search"
                                placeholder="Search..."
                                onFocus={() => {
                                    setModelOpen(true);
                                    (inputRef.current ?? ({} as HTMLInputElement)).focus();
                                }}
                            />
                            <button
                                className="btn-sm bg-primary-800 absolute right-2 top-2/4 flex -translate-y-2/4 transform items-center gap-1 rounded-full !py-1 px-3 font-medium text-slate-300 transition-all duration-200 ease-in-out hover:bg-main-primary/10 focus:outline-none"
                                onClick={() => {
                                    setShowFilter(true);
                                    setModelOpen(true);
                                    ((document.querySelector(".model-search") ?? {}) as HTMLInputElement).focus();
                                }}
                            >
                                <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                </svg>
                                <span className="hidden md:block">Filter</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-none place-content-end items-center justify-end space-x-4">
                        <div className="flex items-center gap-[85px] md:gap-20">
                            <ul className="flex items-center gap-4 font-semibold lg:gap-5">
                                {userData ? (
                                    <li className="text-white lg:flex">
                                        <div className="text-primary-200 flex items-center gap-1 tracking-wide">
                                            <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                            <Link href={`/login?id=${userData.id}`}>{userData.username}</Link>
                                        </div>
                                    </li>
                                ) : null}
                                {!userData ? (
                                    <li className="text-white lg:flex">
                                        <Link href="/login" className="btn btn-sm btn-primary">
                                            Login
                                        </Link>
                                    </li>
                                ) : null}
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>

            <div
                className={`fixed bottom-0 left-0 right-0 top-0 z-[999] flex flex-col items-center justify-center bg-background-dark/70 md:flex-row-reverse ${modelOpen ? "translate-y-0" : "pointer-events-none -translate-y-5 opacity-0"} close-model transition-all duration-200 ease-in-out`}
                style={{
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                }}
                onKeyUp={(event) => {
                    if (event.key === "Escape") {
                        setModelOpen(false);
                    }
                }}
                onClick={(event) => {
                    const target: string[] = String((event.target as HTMLElement)?.className ?? "").split(" ");

                    if (target.includes("close-model")) setModelOpen(false);
                }}
            >
                <div className="close-model flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-4 md:flex-row-reverse">
                    <div className="model mb-auto mt-8 w-full max-w-[800px] overflow-hidden rounded-lg bg-[rgba(99,118,163,0.2)] shadow-xl lg:min-w-[800px]">
                        <div className="flex items-center bg-main-primary/40 text-white">
                            <input className="!focus:ring-0 model-search w-full border-0 bg-transparent p-4 text-lg capitalize !ring-0 focus:outline-none" placeholder="Search by title or synonym..." onKeyUp={search} ref={inputRef} type="search" />
                            <button
                                className="model-filter btn-sm bg-primary-800 right-2 mr-1 flex items-center gap-1 rounded-full !py-1 px-3 font-medium text-slate-300 transition-all duration-200 ease-in-out hover:bg-main-primary/10 focus:outline-none"
                                onClick={() => {
                                    setShowFilter(true);
                                    setModelOpen(true);
                                    ((document.querySelector(".model-search") ?? {}) as HTMLInputElement).focus();
                                }}
                            >
                                <svg width="24" height="24" stroke="currentColor" strokeWidth="2" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                </svg>
                                <span className="hidden md:block">Filter</span>
                            </button>
                        </div>
                        <div className="min-h-[15vh] overflow-x-auto overflow-y-hidden bg-background-token/70">
                            <nav className="min-h-[50vh]">
                                <ul>
                                    {requesting ? (
                                        <div className="flex h-full w-full items-center justify-center py-10">
                                            <figure className="flex flex-col items-center space-y-4">
                                                <div
                                                    className="block aspect-square w-12 animate-spin rounded-full"
                                                    style={{
                                                        background: "conic-gradient(transparent, rgb(168, 241, 218) 75%)",
                                                    }}
                                                />
                                            </figure>
                                        </div>
                                    ) : null}
                                    {!requesting && searchData?.query === "ERROR" ? <h1 className="px-2 text-white">An error occurred!</h1> : null}
                                    {!requesting && (searchData?.hits.length ?? 0) > 0 ? searchData?.hits.map((item, index) => <SearchItem key={index} media={item} />) : null}
                                </ul>
                            </nav>
                        </div>
                        <footer className="hidden items-center gap-2 bg-main-primary/40 p-4 text-xs font-bold text-white md:flex">
                            <div className="mr-3">
                                <kbd className="border-b-[2px] border-[rgb(49,58,80)] bg-[rgb(89,106,147)] px-[0.375rem] py-[3px] font-bold">Esc</kbd> to close.
                            </div>
                            <div className="mr-3">
                                <kbd className="border-b-[2px] border-[rgb(49,58,80)] bg-[rgb(89,106,147)] px-[0.375rem] py-[3px] font-bold">Tab</kbd> to navigate.
                            </div>
                            <div className="mr-3">
                                <kbd className="border-b-[2px] border-[rgb(49,58,80)] bg-[rgb(89,106,147)] px-[0.375rem] py-[3px] font-bold">Enter</kbd> to select.
                            </div>
                        </footer>
                    </div>
                    <div className={`z-10 mx-auto mb-[12.5vh] mt-5 w-[300px] rounded-md bg-main-primary/40 p-4 md:right-0 md:mr-5 md:mt-0 md:h-[82%] ${showFilter ? "block translate-y-0" : "pointer-events-none hidden -translate-y-5 opacity-0"} transition-all duration-200 ease-in-out`}>
                        <button className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center !ring-0 focus:outline-none focus:ring-0" onClick={() => setShowFilter(false)}>
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                        <div className="flex flex-col gap-5">
                            <div>
                                <div className="flex flex-row items-center">
                                    <h2 className="text-lg font-semibold text-white">Filter By Type</h2>
                                </div>
                                <div className="space-y-2">
                                    <Select
                                        options={searchSelector}
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
                                                    backgroundColor: "#2e2e2e",
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
                                        defaultValue={active === "anime" ? searchSelector[0] : active === "manga" ? searchSelector[1] : active === "novel" ? searchSelector[2] : searchSelector[0]}
                                        isSearchable={false}
                                        name=""
                                        onChange={updateSearchSelector}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex flex-row items-center">
                                    <h2 className="text-lg font-semibold text-white">Filter By Genres</h2>
                                </div>
                                <div className="space-y-2">
                                    <Select
                                        options={genresSelector}
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
                                                    backgroundColor: "#2e2e2e",
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
                                            multiValue: (baseStyles) => ({
                                                ...baseStyles,
                                                backgroundColor: "#1f1f1f",
                                                color: "white",
                                                transition: "0.2s all",
                                                cursor: "pointer",
                                                ":hover": {
                                                    backgroundColor: "#2e2e2e",
                                                },
                                                ":active": {
                                                    color: "white",
                                                    backgroundColor: "#1f1f1f",
                                                },
                                                lineHeight: "1.25rem",
                                                height: "100%",
                                            }),
                                            multiValueLabel: (baseStyles) => ({
                                                ...baseStyles,
                                                color: "white",
                                            }),
                                            multiValueRemove: (baseStyles) => ({
                                                ...baseStyles,
                                                transition: "0.2s all",
                                            }),
                                        }}
                                        defaultValue={genresSelector[0]}
                                        isSearchable={false}
                                        name=""
                                        isMulti={true}
                                        onChange={updateGenresSelector}
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            className="mt-4 rounded-md bg-main px-4 py-2 text-white transition-all duration-200 ease-in-out hover:bg-main-dark focus:outline-none"
                            onClick={() => {
                                void searchRequest((inputRef.current ?? ({} as HTMLInputElement)).value);
                            }}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Navbar;
