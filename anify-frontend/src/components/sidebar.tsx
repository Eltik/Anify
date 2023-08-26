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
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                ),
                href: "/",
                id: "home",
            },
            {
                label: "Anime",
                svg: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                        <path d="m10 7 5 3-5 3Z"/>
                        <rect width="20" height="14" x="2" y="3" rx="2"/>
                        <path d="M12 17v4"/><path d="M8 21h8"/>
                    </svg>
                ),
                href: "/anime",
                id: "anime",
            },
            {
                label: "Manga",
                svg: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                        <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
                    </svg>
                ),
                href: "/manga",
                id: "manga",
            },
            {
                label: "Novels",
                svg: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                    </svg>
                ),
                href: "/novels",
                id: "novel",
            }
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
        <aside className={`flex-none overflow-x-hidden overflow-y-auto fixed inset-x-0 bottom-0 md:top-0 md:left-0 md:w-fit md:!h-full bg-[rgba(99,118,163,0.05)] transition-all md:flex !z-[999] ${!showNavbar ? "opacity-0 -translate-y-5 md:opacity-100 md:translate-y-0" : "opacity-100 translate-y-0"}`}>
            <aside className="flex w-full md:w-fit h-full overflow-hidden md:flex-col">
                <div className="flex w-full h-full md:w-auto md:flex-col md:items-center bg-main-primary/10" style={{
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)"
                }}>
                    <Link href="/" className="flex md:block items-center justify-center mt-0 ml-2 md:mt-5 md:ml-0">
                        {/*<Image src={"/icon_logo.png"} className="w-10" width={10} height={10} alt="Icon" />*/}
                        <Logo className="w-10" />
                    </Link>
                    <div className="justify-center my-auto flex flex-row md:flex-col w-full ml-2 md:w-auto md:ml-0">
                        <div className="flex flex-row md:flex-col items-center md:p-0 md:mt-0 w-full md:w-auto justify-between md:justify-center h-full md:h-auto">
                            <CSSTabs {...css.tabProps} />
                        </div>
                    </div>
                    <Link className="hidden md:flex items-center justify-center w-16 h-16 mt-auto md:mt-0 variant-soft-primary hover:bg-main-primary/20 hover:text-main-primary transition-all duration-200 text-white" href="/logout">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" x2="9" y1="12" y2="12"/>
                        </svg>
                    </Link>
                </div>
            </aside>
        </aside>
        </>
    )
}

export default Sidebar;