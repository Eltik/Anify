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
            <Link href={`/info/${media.id}`} className="relative flex hover:bg-main-primary/20 transition-all duration-200 ease-in-out w-full gap-2 p-4 shadow-md search-item">
                <Image src={media.coverImage ?? ""} className="w-16 h-24 rounded-md mb-2" width={256} height={384} alt={media.title.english + " Cover"} loading="lazy" />
                <div className="flex flex-col gap-1">
                    <span className="text-lg font-semibold mb-1 whitespace-normal line-clamp-1 md:line-clamp-2 text-white">{media.title.english ?? media.title.romaji ?? media.title.native}</span>
                    <div className="text-xs md:text-sm flex items-center gap-1 text-slate-300 md:mb-1">
                        <span className="">Status: {parseStatus(media.status)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1"/>
                        </svg>
                        <span className="">Format: {parseFormat(media.format)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1"/>
                        </svg>
                        <span className="">Year: {media.year}</span>
                    </div>
                    <div className="text-sm hidden md:flex items-center gap-1 text-slate-300">
                        <span className="">{(media as Anime | Manga).type === Type.ANIME ? "Total Ep" : "Total Chap"}: {(media as Anime).type === Type.ANIME ? (media as Anime).totalEpisodes ?? "N/A" : (media as any).totalChapters ?? "N/A"}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1"/>
                        </svg>
                        <span className="">Genres: {media.genres.slice(0, 3).map((genre, index) => {
                            return index > 0 ? `, ${genre}` : genre;
                        })}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <circle cx="12.1" cy="12.1" r="1"/>
                        </svg>
                        <span className="">Type: {capitalize((media as Anime | Manga).type ?? "N/A")}</span>
                    </div>
                </div>
                <div className="hidden md:block absolute top-2 right-4 text-xs text-white font-bold px-2 py-1 rounded-full bg-main-primary/20">
                    <span className="">
                        Rating: {handleRating(media.rating).toFixed(2)}
                    </span>
                </div>
            </Link>
        </>
    )
};

const handleRating = (rating: { mal?: number; kitsu?: number; anilist?: number; simkl?: number;}) => {
    const validRatings = Object.values(rating).filter(value => value !== undefined);
    
    if (validRatings.length === 0) {
        return 0; // Return 0 if all ratings are undefined
    }
    
    const sum = validRatings.reduce((total, value) => total + value, 0);
    const average = sum / validRatings.length;
    
    return average;
};

export default SearchItem;