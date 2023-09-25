import axios from "axios";
import { useSpring, animated } from "react-spring";
import Link from "next/link";

import { type GetServerSideProps, type NextPage } from "next";
import Sidebar from "~/components/sidebar";

import { env } from "~/env.mjs";
import Footer from "~/components/footer";
import { type Stats } from "~/types";
import Navbar from "~/components/navbar";
import Head from "next/head";

const Home: NextPage<Props> = ({ stats }) => {
    const AnimatedNumber = ({ value }: { value: number }) => {
        const animatedProps = useSpring({ from: { value: 0 }, to: { value } });

        return <animated.p className="text-4xl font-extrabold text-main">{animatedProps.value.interpolate((val) => Math.floor(val))}</animated.p>;
    };

    return (
        <>
            <Head>
                <title>{"Anify"}</title>
                <meta name="title" content={"Anify"} />
                <meta name="description" content={"The ultimate Japanese media destination."} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://anify.tv/`} />
                <meta property="og:title" content={"Anify"} />
                <meta property="og:description" content={"The ultimate Japanese media destination."} />
                <meta property="og:image" content={""} />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://anify.tv/`} />
                <meta property="twitter:title" content={"Anify"} />
                <meta property="twitter:description" content={"The ultimate Japanese media destination."} />
                <meta property="twitter:image" content={""} />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Sidebar active="home" />
            <Navbar active="home" />
            <main>
                <div className="mb-8 mt-8 flex flex-col justify-center">
                    <div className="mx-auto px-4 py-5 sm:px-0 md:py-16">
                        <div className="text-center">
                            <h1 className="mt-6 text-6xl font-extrabold leading-8 tracking-tight text-white">Anify</h1>
                            <p className="text-md mt-8 max-w-2xl text-gray-300 sm:text-lg lg:mx-auto">Watch anime in HD quality, read manga seamlessly with easy-to-use features, catch up with your favorite light novels, and more all in one place.</p>
                        </div>
                    </div>
                    <div className="flex flex-col lg:mt-10 lg:items-center lg:justify-center">
                        <div className="mx-auto mb-10">
                            <Link href="/anime" className="mx-auto mt-[.75rem] w-full rounded-md bg-main p-[.75rem_1.5rem] font-semibold text-white shadow-md transition-all duration-150 hover:bg-main-dark">
                                Get Started
                            </Link>
                        </div>
                        <div className="mx-auto grid max-w-[85%] grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-lg bg-background-light p-8">
                                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-main text-white">
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="mt-6 text-lg font-medium text-white">Advanced</h3>
                                <p className="mt-2 text-base text-gray-300">Anify has gone through many redesigns to match the best websites out there.</p>
                            </div>
                            <div className="rounded-lg bg-background-light p-8">
                                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-main text-white">
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="mt-6 text-lg font-medium text-white">Customizable</h3>
                                <p className="mt-2 text-base text-gray-300">Change Anify&apos;s functions to personalize your experience.</p>
                            </div>
                            <div className="rounded-lg bg-background-light p-8">
                                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-main text-white">
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="mt-6 text-lg font-medium text-white">Seamless</h3>
                                <p className="mt-2 text-base text-gray-300">Each feature is vetted to make sure each user has the best experience possible.</p>
                            </div>
                        </div>
                        <div className="mx-auto mt-24 flex w-full flex-col items-center justify-center rounded-md bg-background-light">
                            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                                <div className="text-center">
                                    <p className="text-base font-bold uppercase leading-6 tracking-wide text-main-light">Modern</p>
                                    <h3 className="text-4xl font-extrabold text-white">Revolutionizing Anime Websites</h3>
                                    <p className="mt-3 text-base text-gray-400">Using the latest technologies, Anify is able to provide a seamless experience for all users.</p>
                                </div>
                                <div className="mx-auto mt-10 md:max-w-[85%]">
                                    <ul className="items-center justify-center md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                                        <li className="md_mt-0 mt-10">
                                            <div className="flex">
                                                <div className="shrink-0">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-main text-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 stroke-current">
                                                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                                                            <path d="M9 18h6" />
                                                            <path d="M10 22h4" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <h5 className="font-semibold text-white">Experienced</h5>
                                                    <p className="dark_text-gray-400 mt-2 text-base leading-6 text-gray-400">Recoded and redesigned with the most popular anime, manga, and light novel websites in mind over many years.</p>
                                                </div>
                                            </div>
                                        </li>
                                        <li className="md_mt-0 mt-10">
                                            <div className="flex">
                                                <div className="shrink-0">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-main text-white">
                                                        <svg className="h-6 w-6 stroke-current" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 3v18h18" />
                                                            <path d="m19 9-5 5-4-4-3 3" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <h5 className="font-semibold text-white">Continously Improved</h5>
                                                    <p className="dark_text-gray-400 mt-2 text-base leading-6 text-gray-400">Anify is built on the basis of tailoring each feature to what the community wants. Features are added based on what is popular and what is trending in the anime/manga/novel community.</p>
                                                </div>
                                            </div>
                                        </li>
                                        <li className="md_mt-0 mt-10">
                                            <div className="flex">
                                                <div className="shrink-0">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-main text-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 stroke-current">
                                                            <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                                                            <path d="m9 12 2 2 4-4" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <h5 className="font-semibold text-white">Reliable</h5>
                                                    <p className="dark_text-gray-400 mt-2 text-base leading-6 text-gray-400">With the use of multiple providers, if one anime or manga provider is down you can always keep up-to-date with your favorite shows and series.</p>
                                                </div>
                                            </div>
                                        </li>
                                        <li className="md_mt-0 mt-10">
                                            <div className="flex">
                                                <div className="shrink-0">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-main text-white">
                                                        <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <h5 className="font-semibold text-white">Active Community</h5>
                                                    <p className="dark_text-gray-400 mt-2 text-base leading-6 text-gray-400">Anify is powered by it&apos;s growing community implementing suggestions as they come so that the website will always be modern and unique compared to other popular websites.</p>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="relative mt-12 flex flex-col items-center justify-center">
                            <div className="5xl max-w-10xl mx-auto px-4 sm:max-w-7xl sm:px-6 lg:px-8">
                                <div className="mx-auto max-w-4xl text-center">
                                    <p className="text-base font-bold uppercase leading-6 tracking-wide text-main-light">Large Library</p>
                                    <h2 className="text-4xl font-extrabold text-white">Incredible Statistics</h2>
                                    <p className="mt-3 text-base text-gray-400">Ever-increasing library of anime, manga, and light novels.</p>
                                </div>
                            </div>
                            <div className="mt-10">
                                <div className="5xl:max-w-10xl relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                                    <div className="mx-auto max-w-4xl">
                                        <div className="flex flex-wrap items-center justify-center rounded-md bg-background-light shadow-md sm:flex-nowrap">
                                            <div className="border-b border-zinc-700 p-[1.5rem] text-center sm:border-0 sm:border-r">
                                                <AnimatedNumber value={stats.anime} />
                                                <p className="text-xl font-bold text-gray-300">Anime</p>
                                            </div>
                                            <div className="border-b border-t border-zinc-700 p-[1.5rem] text-center sm:border-0 sm:border-l sm:border-r">
                                                <AnimatedNumber value={stats.manga} />
                                                <p className="text-xl font-bold text-gray-300">Manga</p>
                                            </div>
                                            <div className="border-t border-zinc-700 p-[1.5rem] text-center sm:border-0 sm:border-l">
                                                <AnimatedNumber value={stats.novels} />
                                                <p className="text-xl font-bold text-gray-300">Novels</p>
                                            </div>
                                            <div className="border-t border-zinc-700 p-[1.5rem] text-center sm:border-0 sm:border-l">
                                                <AnimatedNumber value={stats.skipTimes} />
                                                <p className="text-xl font-bold text-gray-300">Skip Times</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
};

export const getServerSideProps: GetServerSideProps = async () => {
    const data = (await axios.get(String(env.BACKEND_URL) + "/stats?apikey=" + String(env.API_KEY))).data as Stats;

    return {
        props: {
            stats: data,
        },
    };
};

export default Home;

interface Props {
    stats: Stats;
}
