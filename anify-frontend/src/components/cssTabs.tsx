import Link from "next/link";
import { type PointerEvent, type FocusEvent, useEffect, useRef, useState, type CSSProperties } from "react";
import { Tab } from "~/helper/useTabs";

// Credit: https://www.joshuawootonn.com/vercel-tabs-component
function CSSTabs ({ tabs, selectedTabIndex, setSelectedTab }: Props) {
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
            <nav ref={navRef} className="flex md:flex-col w-full flex-shrink-0 justify-center items-center relative z-0 md:py-2 md:pr-1" onPointerLeave={onLeaveTabs}>
                {tabs.map((item, i) => {
                    return (
                        <Link href={item.href} key={i} className={"text-white flex items-center justify-center w-[75%] md:w-12 md:h-12 md:mt-0"}>
                            <button className={`text-md relative rounded-md flex items-center justify-center h-8 w-full md:w-auto px-4 py-6 z-20 bg-transparent text-sm cursor-pointer select-none transition-colors ${hoveredTabIndex === i || selectedTabIndex === i ? "text-main-primary bg-main-primary/20" : ""} border-t-4 md:border-l-4 md:border-t-0 ${selectedTabIndex === i ? "border-main-primary" : "border-transparent"}`} ref={(el) => (buttonRefs[i] = el)} onPointerEnter={(e) => onEnterTab(e, i)} onFocus={(e) => onEnterTab(e, i)} onClick={() => onSelectTab(i)}>
                                {item.svg ?? item.label}
                            </button>
                        </Link>
                    );
                })}
                <div className="absolute z-10 top-0 left-0 rounded-md bg-main-primary/10 transition-[width] border-main-primary border-t-4 md:border-l-4 md:border-t-0" style={hoverStyles} />
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