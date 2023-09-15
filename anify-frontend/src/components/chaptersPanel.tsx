import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function ChaptersPanel({ contentSelector, showChapters }: { contentSelector: { title: string, number: number, length: string, url: string, selected: boolean }[], showChapters: boolean }) {
    const [selectedChapter, setSelectedChapter] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [minChapters, setMinChapters] = useState(0);
    const [maxChapters, setMaxChapters] = useState(0);
    const ref = useRef(null);

    const amount = 7;

    useEffect(() => {
        contentSelector?.forEach((el, i: number) => {
            if (el.selected) {
                setSelectedChapter(i)
            }
        })

        setMinChapters(selectedChapter - amount);
        setMaxChapters(selectedChapter + amount > contentSelector.length ? contentSelector.length : selectedChapter + amount);
    }, [contentSelector, selectedChapter])

    const loadMoreChapters = () => {
        setIsLoadingMore(true);

        setMinChapters(minChapters - amount < 0 ? 0 : minChapters - amount);
        setMaxChapters(maxChapters + amount > contentSelector.length ? contentSelector.length : maxChapters + amount);
        
        setIsLoadingMore(false);
    };

    return (
        <div ref={ref} style={{
            backgroundColor: "rgba(10,10,10,0.8)",
            outline: "1px solid rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)"
        }} className={`w-[280px] pt-[12px] rounded-[12px] transition-all duration-300 overflow-x-hidden overflow-y-auto absolute max-h-[80vh] sm:max-h-[50vh] top-[55px] right-[20px] ${showChapters ? "opacity-100 pointer-events-auto -translate-y-0" : "opacity-0 pointer-events-none translate-y-5"}`}>
            <div className="pl-[12px] flex justify-between items-center mb-[8px] mr-[20px] pt-[10px] pb-[14px] border-b-[1px] border-b-[#8a8a8a] text-white text-lg">
                Chapters
                <svg width="20" height="18" viewBox="0 0 20 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.6061 17.1678C10.284 17.1678 10.0228 16.9066 10.0228 16.5844L10.0228 1.41778C10.0228 1.09561 10.284 0.834442 10.6061 0.834442L12.3561 0.834442C12.6783 0.834442 12.9395 1.09561 12.9395 1.41778L12.9395 16.5844C12.9395 16.9066 12.6783 17.1678 12.3561 17.1678H10.6061Z" />
                    <path d="M17.0228 17.1678C16.7006 17.1678 16.4395 16.9066 16.4395 16.5844L16.4395 1.41778C16.4395 1.09561 16.7006 0.834442 17.0228 0.834442L18.7728 0.834442C19.095 0.834442 19.3561 1.09561 19.3561 1.41778V16.5844C19.3561 16.9066 19.095 17.1678 18.7728 17.1678H17.0228Z" />
                    <path d="M0.796022 15.9481C0.71264 16.2593 0.897313 16.5791 1.2085 16.6625L2.89887 17.1154C3.21006 17.1988 3.52992 17.0141 3.61331 16.703L7.53873 2.05308C7.62211 1.74189 7.43744 1.42203 7.12625 1.33865L5.43588 0.885715C5.12469 0.802332 4.80483 0.987005 4.72144 1.29819L0.796022 15.9481Z" />
                </svg>
            </div>
            {contentSelector.map((el, i: number) => {
                if (i < minChapters || i >= maxChapters) return null;
                return (
                    <Link key={i} href={`${el.url ?? ""}`} className={`chapterItem ${selectedChapter === i ? "active" : ""} cursor-pointer`} onClick={() => {
                        setSelectedChapter(i)
                    }}>
                        <h4 className="w-[42px] h-[52px] flex justify-center pt-[8px] font-normal text-zinc-500 text-sm pr-2">{el.number}</h4>
                        <div className="flex flex-col">
                            <h4 className="font-medium text-white text-base line-clamp-1">{el.title}</h4>
                            <h4 className="text-[#8a8a8a] font-normal text-sm">{el.length}</h4>
                        </div>
                    </Link>
                )
            })}

            <button className={`text-white text-sm ${isLoadingMore ? 'opacity-50 pointer-events-none' : 'hover:text-main-light hover:bg-gray-100/20'} w-full px-2 py-1 transition-all duration-200 rounded-b-md bg-gray-50/10`} onClick={loadMoreChapters}>
                {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
        </div>
    );
}