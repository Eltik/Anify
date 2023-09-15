/* eslint-disable @next/next/no-img-element */

import { type Anime, type Manga } from "~/types";
import MediaItem from "./mediaItem";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const Slideshow = ({ media, recent }: { media: Anime[] | Manga[], recent?: boolean }) => {
    return (
        <>
            <Swiper slidesPerView={"auto"} className="relative h-fit" freeMode={true}>
                {media.map((media, index: number) => {
                    return (
                        <SwiperSlide key={index} className="!w-fit px-2">
                            <MediaItem media={media} recent={recent} />
                        </SwiperSlide>
                    )
                })}
            </Swiper>
        </>
    )
};

export default Slideshow;