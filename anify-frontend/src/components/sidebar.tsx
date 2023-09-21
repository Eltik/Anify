import Link from "next/link";
import Logo from "./logo";
import CSSTabs from "./cssTabs";
import { useEffect, useState } from "react";
import { useTabs } from "~/helper/useTabs";

function Sidebar({ active }: { active: "home" | "anime" | "manga" | "novel" }) {
    const [showNavbar, setShowNavbar] = useState(true);
    const [prevScrollPos, setPrevScrollPos] = useState(0);

    const [hookProps] = useState({
        tabs: [
            {
                label: "Home",
                svg: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                ),
                href: "/",
                id: "home",
            },
            {
                label: "Anime",
                svg: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                        <path d="m10 7 5 3-5 3Z" />
                        <rect width="20" height="14" x="2" y="3" rx="2" />
                        <path d="M12 17v4" />
                        <path d="M8 21h8" />
                    </svg>
                ),
                href: "/anime",
                id: "anime",
            },
            {
                label: "Manga",
                svg: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                        <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                    </svg>
                ),
                href: "/manga",
                id: "manga",
            },
            {
                label: "Novels",
                svg: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                ),
                href: "/novels",
                id: "novel",
            },
        ],
        initialTabId: active,
    });
    const css = useTabs(hookProps);

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

    return (
        <>
            <aside className={`fixed inset-x-0 bottom-0 !z-[999] flex-none overflow-y-auto overflow-x-hidden bg-[rgba(99,118,163,0.05)] transition-all md:left-0 md:top-0 md:flex md:!h-full md:w-fit ${!showNavbar ? "-translate-y-5 opacity-0 md:translate-y-0 md:opacity-100" : "translate-y-0 opacity-100"}`}>
                <aside className="flex h-full w-full overflow-hidden md:w-fit md:flex-col">
                    <div
                        className="flex h-full w-full bg-main-primary/10 md:w-auto md:flex-col md:items-center"
                        style={{
                            backdropFilter: "blur(16px)",
                            WebkitBackdropFilter: "blur(16px)",
                        }}
                    >
                        <Link href="/" className="ml-2 mt-0 flex items-center justify-center md:ml-0 md:mt-5 md:block">
                            {/*<Image src={"/icon_logo.png"} className="w-10" width={10} height={10} alt="Icon" />*/}
                            <Logo className="w-10" />
                        </Link>
                        <div className="my-auto ml-2 flex w-full flex-row justify-center md:ml-0 md:w-auto md:flex-col">
                            <div className="flex h-full w-full flex-row items-center justify-between md:mt-0 md:h-auto md:w-auto md:flex-col md:justify-center md:p-0">
                                <CSSTabs {...css.tabProps} />
                            </div>
                        </div>
                        <Link className="variant-soft-primary mt-auto hidden h-16 w-16 items-center justify-center text-white transition-all duration-200 hover:bg-main-primary/20 hover:text-main-primary md:mt-0 md:flex" href="/logout">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" x2="9" y1="12" y2="12" />
                            </svg>
                        </Link>
                    </div>
                </aside>
            </aside>
        </>
    );
}

export default Sidebar;
