import Link from "next/link";

import { type NextPage } from "next";

import Footer from "~/components/footer";
import Head from "next/head";

const Home: NextPage = () => {
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
            <main>
                <div className="mt-8 flex flex-col justify-center mb-8">
                    <div className="text-gray-300/80 px-5">
                        <h1 className="text-4xl font-bold text-main">Anify</h1>
                        <p>Hey everyone! I am terribly sorry, but the public domain for Anify will be shutting down indefinitely. After a long road and a very successful journey, I have decided to shut down the frontend website indefinitely due to external circumstances. I don&apos;t feel comfortable giving people public access to pirated content, and the risk of a legal court case is too high for me to plausibly continue developing Anify. I have decided instead to make the source code open source with the aim to help others learn how to code. That may seem a bit strange considering that I am giving people the ability to develop their own anime websites, so in that case if the project becomes too successful I may make the code closed source again. However, Anify has taught me so much over the past few years that I want others to experience the same joy I had when learning how to code properly and create a clean code base. Anify has been a big part of my life and has helped me nurture my skills as a programmer enough that I hope others will learn from my mistakes and become a more successful programmer in their own way. With all that being said, you can access the GitHub repository via the <Link href={"/discord"} className="text-main-text hover:text-main-primary transition-all duration-150 ease-in-out">Discord</Link> where you can ask for support and learn how to deevelop full-stack websites. Thank you everyone for the amazing experience and for supporting the website over the 3 years Anify has been up. I am sorry that I have to shut down this project, but all good things must come to an end at some point.</p>
                        <p>- Eltik</p>
                        <div className="mt-5">
                            <h2 className="text-2xl font-bold text-main">Credits/Additional Resources</h2>
                            <ul>
                                <li className="mt-2">
                                    <p className="text-main-text">
                                    <Link className="font-bold hover:text-main transition-all duration-150 ease-in-out" href={"https://anify.tv/discord"} target="_blank">Eltik</Link> - Project owner, full-stack developer
                                    </p>
                                </li>
                                <li className="mt-2">
                                    <p className="text-main-text">
                                        <Link className="font-bold hover:text-main transition-all duration-150 ease-in-out" href={"https://discord.gg/yMZTcVstD3"} target="_blank">Consumet</Link> - Large inspiration for the project and provider support
                                    </p>
                                </li>
                                <li className="mt-2">
                                    <p className="text-main-text">
                                        <Link className="font-bold hover:text-main transition-all duration-150 ease-in-out" href={"https://discord.gg/az4XZ6u5Dg"} target="_blank">Chouten</Link> - Where Anify will be going next!
                                    </p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
};

export default Home;
