import { type NextPage } from "next";
import Head from "next/head";
import { useEffect } from "react";
import Footer from "~/components/footer";
import Navbar from "~/components/navbar";
import Sidebar from "~/components/sidebar";
import { useTokens, useUserData } from "~/store/store";

const Logout: NextPage<any> = () => {
    useEffect(() => {
        useUserData.setState({ userData: null });
        useTokens.setState({ tokens: [] });

        window.location.href = "/";
    });

    return (
        <>
            <Head>
                <title>{"Logout"}</title>
                <meta name="title" content={"Logout"} />
                <meta name="description" content={"Logging out..."} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://anify.tv/logout`} />
                <meta property="og:title" content={"Logout"} />
                <meta property="og:description" content={"Logging out..."} />
                <meta property="og:image" content={""} />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://anify.tv/logout`} />
                <meta property="twitter:title" content={"Logout"} />
                <meta property="twitter:description" content={"Logging out..."} />
                <meta property="twitter:image" content={""} />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Sidebar active="home" />
            <Navbar active="home" />
            <main>
                <div className="mx-auto mb-8 mt-24 md:ml-24 md:mr-6">
                    <div className="flex flex-col items-center justify-center">
                        <h1 className="text-center text-4xl font-bold text-white">Logging out...</h1>
                    </div>
                </div>
                <Footer />
            </main>
        </>
    );
};

export default Logout;
