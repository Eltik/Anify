/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { capitalize, parseFormat, parseStatus } from "~/helper";
import { type SearchItem } from "~/pages/api/search";
import { Type, type Anime, type Manga } from "~/types";

const SearchItem = ({ media }: { media: SearchItem }) => {
    return (
        <>
            <Link href={`/info/${media.id}`} className="search-item relative flex w-full gap-2 p-4 shadow-md transition-all duration-200 ease-in-out hover:bg-main-primary/20">
                <Image src={media.coverImage ?? ""} className="mb-2 h-24 w-16 rounded-md" width={256} height={384} alt={media.title.english + " Cover"} loading="lazy" />
                <div className="flex flex-col gap-1">
                    <span className="mb-1 line-clamp-1 whitespace-normal text-lg font-semibold text-white md:line-clamp-2">{media.title.english ?? media.title.romaji ?? media.title.native}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-300 md:mb-1 md:text-sm">
                        <span className="">Status: {parseStatus(media.status)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1" />
                        </svg>
                        <span className="">Format: {parseFormat(media.format)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1" />
                        </svg>
                        <span className="">Year: {media.year}</span>
                    </div>
                    <div className="hidden items-center gap-1 text-sm text-slate-300 md:flex">
                        <span className="">
                            {(media as Anime | Manga).type === Type.ANIME ? "Total Ep" : "Total Chap"}: {(media as Anime).type === Type.ANIME ? (media as Anime).totalEpisodes ?? "N/A" : (media as unknown as Manga).totalChapters ?? "N/A"}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1" />
                        </svg>
                        <span className="">
                            Genres:{" "}
                            {media.genres.slice(0, 3).map((genre, index) => {
                                return index > 0 ? `, ${genre}` : genre;
                            })}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1" />
                        </svg>
                        <span className="">Type: {capitalize((media as Anime | Manga).type ?? "N/A")}</span>
                    </div>
                </div>
                <div className="absolute right-4 top-2 hidden rounded-full bg-main-primary/20 px-2 py-1 text-xs font-bold text-white md:block">
                    <span className="">Rating: {handleRating(media.rating).toFixed(2)}</span>
                </div>
            </Link>
        </>
    );
};

const handleRating = (rating: { mal?: number; kitsu?: number; anilist?: number; simkl?: number }) => {
    if (!rating) return 0;

    const validRatings = Object.values(rating).filter((value) => value !== undefined);

    if (validRatings.length === 0) {
        return 0; // Return 0 if all ratings are undefined
    }

    const sum = validRatings.reduce((total, value) => total + value, 0);
    const average = sum / validRatings.length;

    return average;
};

export default SearchItem;
