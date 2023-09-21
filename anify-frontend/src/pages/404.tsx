import { type NextPage } from "next";
import Sidebar from "~/components/sidebar";

import Footer from "~/components/footer";
import Navbar from "~/components/navbar";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

const FourOhFour: NextPage<null> = () => {
    return (
        <>
            <Head>
                <title>{"404"}</title>
                <meta name="title" content={"404"} />
                <meta name="description" content={"Not found."} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://anify.tv/404`} />
                <meta property="og:title" content={"404"} />
                <meta property="og:description" content={"Not found."} />
                <meta property="og:image" content={""} />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://anify.tv/404`} />
                <meta property="twitter:title" content={"404"} />
                <meta property="twitter:description" content={"Not found."} />
                <meta property="twitter:image" content={""} />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Sidebar active="home" />
            <Navbar active="home" />
            <main>
                <div className="relative flex min-h-screen items-center overflow-hidden">
                    <div className="absolute bottom-0 left-0 top-0 -ml-44 hidden w-64 transform bg-background-light md:-ml-28 md:block md:skew-x-6" />
                    <div className="absolute bottom-0 right-0 top-0 -mr-44 hidden w-48 transform bg-background-light md:-mr-28 md:block md:skew-x-6" />
                    <div className="container relative z-10 mx-auto space-y-16 px-8 py-16 text-center lg:py-32 xl:max-w-7xl">
                        <div>
                            <div className="mb-5 text-gray-300">
                                <svg className="inline-block h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"></path>
                                </svg>
                            </div>
                            <span className="text-6xl font-extrabold text-main-text md:text-7xl">404</span>
                            <div className="mx-auto my-6 h-1.5 w-12 rounded-lg bg-gray-400 md:my-10" />
                            <h1 className="mb-3 text-2xl font-extrabold text-main-light md:text-3xl">Page not found!</h1>
                            <div className="mx-auto text-2xl font-medium text-main-text md:leading-relaxed lg:w-4/5">Oops! Looks like the page you are looking for couldn&apos;t be found. We&apos;re working on it to get things back on track. Try refreshing the page or come back later.</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                window.location.reload();
                            }}
                            className="group inline-flex items-center justify-center space-x-2 rounded-lg bg-main px-3 py-2 text-sm font-semibold leading-5 hover:text-gray-700 hover:shadow-sm active:shadow-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 ease-in-out group-hover:rotate-45">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                <path d="M8 16H3v5" />
                            </svg>
                            <span className="">Refresh</span>
                        </button>
                        <Link href="/" className="group ml-5 inline-flex items-center justify-center space-x-2 rounded-lg bg-main px-3 py-2 text-sm font-semibold leading-5 hover:text-gray-700 hover:shadow-sm active:shadow-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 ease-in-out group-hover:translate-x-1">
                                <path d="M6 8L2 12L6 16" />
                                <path d="M2 12H22" />
                            </svg>
                            <span className="">Back Home</span>
                        </Link>
                    </div>
                    <Image src={"/character.png"} className="absolute z-0 mt-56 hidden h-[85%] w-auto md:inset-0 lg:block lg:opacity-50 xl:opacity-100" width={1000} height={1000} alt="Character" loading="lazy" />
                </div>
            </main>
            <Footer />
        </>
    );
};

export default FourOhFour;
