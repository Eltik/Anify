/* eslint-disable @next/next/no-img-element */

import { Type, type Anime, type Manga } from "~/types";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Image from "next/image";
import Link from "next/link";

const LargeSlideshow = ({ media }: { media: Anime[] | Manga[] }) => {
    return (
        <>
            <Swiper slidesPerView={1} className="relative h-fit rounded-md" freeMode={true}>
                {media.map((media, index: number) => {
                    return (
                        <SwiperSlide key={index} className="relative flex h-screen items-center justify-center">
                            <div className="relative h-96 w-full 2xl:h-[34rem]">
                                {/*
                                {(media as Anime).trailer ? (
                                    <div className="md:w-[2500.333333px] md:left-0 md:h-[1405px] md:top-0 md:absolute md:right-0 md:bottom-0 md:z-[-1]">
                                        <div className="absolute inset-0 bg-black opacity-50 sm:block hidden" />
                                        <div className="w-full h-full md:block hidden">
                                            <iframe className="relative top-0 right-0 bottom-0 w-full h-full z-[-1]" frameBorder={0} loading="lazy" allowFullScreen={false} allow={"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"} src={`https://www.youtube-nocookie.com/embed/${(media as Anime).trailer?.split("/watch?v=")[1] ?? ""}?autoplay=1&amp;controls=0&amp;rel=0&amp;showinfo=0&amp;mute=1&amp;modestbranding=1&amp;iv_load_policy=3&amp;playsinline=1&amp;enablejsapi=1&amp;origin=https%3A%2F%2Fanify.tv&amp;widgetid=1`} id="widget2" />
                                        </div>
                                        <Image src={media.bannerImage && media.bannerImage.length > 0 ? media.bannerImage : media.coverImage ?? ""} alt={media.title.english ?? media.title.romaji ?? media.title.native ?? "Unknown"} className="w-full h-full opacity-50 object-cover block md:hidden" fill={true} loading="lazy" />
                                    </div>
                                ) : (
                                    <Image src={media.bannerImage && media.bannerImage.length > 0 ? media.bannerImage : media.coverImage ?? ""} alt={media.title.english ?? media.title.romaji ?? media.title.native ?? "Unknown"} className="w-full h-full opacity-50 object-cover" fill={true} loading="lazy" />
                                )}
                                */}
                                <Image src={media.bannerImage && media.bannerImage.length > 0 ? media.bannerImage : media.coverImage ?? ""} alt={media.title.english ?? media.title.romaji ?? media.title.native ?? "Unknown"} className="h-full w-full object-cover opacity-50" fill={true} loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70" />
                                <div className="absolute inset-0 mt-16 flex flex-col justify-center px-2 lg:max-w-[50%] lg:px-14">
                                    <h2 className="mb-4 line-clamp-2 text-4xl font-bold text-white">{media.title.english ?? media.title.romaji ?? media.title.native}</h2>
                                    <p className="line-clamp-2 text-sm font-semibold text-gray-100 xl:max-w-[60%]">{media.description?.replace(/<[^>]*>?/gm, "").slice(0, 200) ?? "No description available."}</p>
                                    <div className="mt-2 flex flex-wrap text-sm">
                                        {media.genres.slice(0, 3).map((genre, index: number) => (
                                            <span key={index} className="mb-2 mr-2 inline-block rounded-md bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800">
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mb-8 mt-8 flex flex-wrap space-x-4 text-sm">
                                        <Link href={`/info/${media.id}`} className="rounded-lg bg-white px-5 py-2 font-bold text-black transition duration-300 ease-in-out hover:bg-gray-300">
                                            {media.type === Type.ANIME ? "Watch Now" : "Read Now"}
                                        </Link>
                                        <Link href={`/info/${media.id}`} className="rounded-lg bg-main px-3 py-2 font-bold text-white transition duration-300 ease-in-out hover:bg-main/80">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="icon">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"></path>
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    );
                })}
            </Swiper>
        </>
    );
};

export default LargeSlideshow;
