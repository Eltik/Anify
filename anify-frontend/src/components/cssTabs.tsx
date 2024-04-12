import Link from "next/link";
import { type PointerEvent, type FocusEvent, useEffect, useRef, useState, type CSSProperties } from "react";
import { type Tab } from "~/helper/useTabs";

// Credit: https://www.joshuawootonn.com/vercel-tabs-component
function CSSTabs({ tabs, selectedTabIndex, setSelectedTab }: Props) {
    const [buttonRefs, setButtonRefs] = useState<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
        setButtonRefs((prev) => prev.slice(0, tabs.length));
    }, [tabs.length]);

    const [hoveredTabIndex, setHoveredTabIndex] = useState<number | null>(null);
    const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

    const navRef = useRef<HTMLDivElement>(null);
    const navRect = navRef.current?.getBoundingClientRect();

    const selectedRect = buttonRefs[selectedTabIndex]?.getBoundingClientRect();

    const [isInitialHoveredElement, setIsInitialHoveredElement] = useState(true);
    const isInitialRender = useRef(true);

    const onLeaveTabs = () => {
        setIsInitialHoveredElement(true);
        setHoveredTabIndex(null);
    };

    const onEnterTab = (e: PointerEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, i: number) => {
        if (!e.target || !(e.target instanceof HTMLButtonElement)) return;

        setHoveredTabIndex((prev) => {
            if (prev != null && prev !== i) {
                setIsInitialHoveredElement(false);
            }

            return i;
        });
        setHoveredRect(e.target.getBoundingClientRect());
    };

    const onSelectTab = (i: number) => {
        setSelectedTab(i);
    };

    const hoverStyles: CSSProperties = { opacity: 0 };
    if (navRect && hoveredRect) {
        hoverStyles.transform = `translate3d(${hoveredRect.left - navRect.left}px,${hoveredRect.top - navRect.top}px,0px)`;
        hoverStyles.width = hoveredRect.width;
        hoverStyles.height = hoveredRect.height;
        hoverStyles.opacity = hoveredTabIndex != null ? 1 : 0;
        hoverStyles.transition = isInitialHoveredElement ? `opacity 150ms` : `transform 150ms 0ms, opacity 150ms 0ms, width 150ms`;
    }

    const selectStyles: CSSProperties = { opacity: 0 };
    if (navRect && selectedRect) {
        selectStyles.width = selectedRect.width * 0.8;
        selectStyles.transform = `translateX(calc(${selectedRect.left - navRect.left}px + 10%))`;
        selectStyles.opacity = 1;
        selectStyles.transition = isInitialRender.current ? `opacity 150ms 150ms` : `transform 150ms 0ms, opacity 150ms 150ms, width 150ms`;

        isInitialRender.current = false;
    }

    return (
        <>
            <nav ref={navRef} className="relative z-0 flex w-full flex-shrink-0 items-center justify-center md:flex-col md:py-2 md:pr-1" onPointerLeave={onLeaveTabs}>
                {tabs.map((item, i) => {
                    return (
                        <Link href={item.href} key={i} className={"flex w-[75%] items-center justify-center text-white md:mt-0 md:h-12 md:w-12"}>
                            <button className={`text-md relative z-20 flex h-8 w-full cursor-pointer select-none items-center justify-center rounded-md bg-transparent px-4 py-6 text-sm transition-colors md:w-auto ${hoveredTabIndex === i || selectedTabIndex === i ? "bg-main-primary/20 text-main-primary" : ""} border-t-4 md:border-l-4 md:border-t-0 ${selectedTabIndex === i ? "border-main-primary" : "border-transparent"}`} ref={(el) => (buttonRefs[i] = el)} onPointerEnter={(e) => onEnterTab(e, i)} onFocus={(e) => onEnterTab(e, i)} onClick={() => onSelectTab(i)}> {/* eslint-disable-line */}
                                {item.svg ?? item.label}
                            </button>
                        </Link>
                    );
                })}
                <div className="absolute left-0 top-0 z-10 rounded-md border-t-4 border-main-primary bg-main-primary/10 transition-[width] md:border-l-4 md:border-t-0" style={hoverStyles} />
            </nav>
        </>
    );
}

export default CSSTabs;

type Props = {
    selectedTabIndex: number;
    tabs: Tab[];
    setSelectedTab: (input: number) => void;
};
