/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { type GetServerSideProps, type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import Footer from "~/components/footer";
import Navbar from "~/components/navbar";
import Sidebar from "~/components/sidebar";
import { env } from "~/env.mjs";
import { usePreferredList, useTokens, useUserData } from "~/store/store";
import { type UserData, type AuthProviders, type UserTokens } from "~/types";

const Login: NextPage<Props> = ({ login, user, token, provider, providers, redirect, error }) => {
    const [createAccount, setCreateAccount] = useState(false);

    const userData = useStore(useUserData, ((state: any) => state.userData as UserData));
    const userTokens = useStore(useTokens, ((state: any) => state.tokens as UserTokens[]));

    const [showError, setShowError] = useState(true);

    useEffect(() => {
        if (redirect) {
            if (userData) {
                window.location.replace(`/login?token=${token ?? ""}&provider=${provider ?? ""}&id=${userData.id}`);
            }
        } else {
            if (token && provider) {
                useUserData.setState({ userData });

                if (Array.isArray(userTokens)) {
                    userTokens?.push({ id: provider, accessToken: token });
                }
                useTokens.setState({ tokens: [...(userTokens ?? []), { id: provider, accessToken: token }] });
                usePreferredList.setState({ preferredList: provider });

                window.location.replace(`/login?id=${user?.id ?? ""}`);
            }
        }
        if (user && !userData) {
            useUserData.setState({ userData: user });
        }
    })

    return (
        <>
            <Head>
                <title>{"Login"}</title>
                <meta name="title" content={"Login"} />
                <meta name="description" content={"Login to Anify and unlock premium features to enhance your experience."} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://anify.tv/login`} />
                <meta property="og:title" content={"Login"} />
                <meta property="og:description" content={"Login to Anify and unlock premium features to enhance your experience."} />
                <meta property="og:image" content={""} />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://anify.tv/login`} />
                <meta property="twitter:title" content={"Login"} />
                <meta property="twitter:description" content={"Login to Anify and unlock premium features to enhance your experience."} />
                <meta property="twitter:image" content={""} />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Sidebar active="home" />
            <Navbar active="home" />
            <main>
                <div className="md:ml-24 md:mr-6 mx-auto mt-24 mb-8">
                    {login ? (
                        <div className="w-full max-w-[400px] p-14 rounded-md bg-background-light text-center mx-auto text-white">
                            <h1 className="font-semibold mb-14 text-3xl text-main">{createAccount ? "Create Account" : "Login"}</h1>
                            <form className="mb-4" onSubmit={(event) => {
                                const username = String((event.target as any)[0].value);
                                const password = String((event.target as any)[1].value);

                                if (createAccount) {
                                    window.location.href = "/login?register=true&username=" + username + "&password=" + password;
                                } else {
                                    window.location.href = "/login?login=true&username=" + username + "&password=" + password;
                                }
                                event.preventDefault();
                            }}>
                                <input placeholder="Username" className="bg-background rounded-md border-0 shadow-none text-main-text p-[0_15px] w-full outline-none h-[40px] mb-3" autoComplete="off" />
                                <input placeholder="Password" className="bg-background rounded-md border-0 shadow-none text-main-text p-[0_15px] w-full outline-none h-[40px]" autoComplete="off" type="password" />
                                <button type="submit" className="bg-main cursor-pointer inline-block p-[10px_30px] mt-[10px] rounded-md text-sm hover:bg-main-dark transition-all duration-200 ease-in-out">{createAccount ? "Create Account" : "Login"}</button>
                            </form>
                            {!createAccount ? (
                                <button type="button" onClick={() => {
                                    setCreateAccount(true);
                                }} className="text-main-text text-sm">Not registered? <span className="text-main">Create an account</span></button>
                            ) : <button type="button" onClick={() => {
                                setCreateAccount(false);
                            }} className="text-main-text text-sm">Already registered? <span className="text-main">Login</span></button>}
                        </div>
                    ) : (
                        <div className="bg-background-light/30 py-5 lg:max-w-[90%] mx-auto px-5 text-center">
                            <h1 className="text-3xl font-bold text-white">Providers</h1>
                            <br />
                            <div className="flex flex-row flex-wrap gap-5 items-center justify-center">
                                {providers?.map((p, index) => (
                                    <div key={index} className="flex flex-col justify-center items-center">
                                        <div className="w-32 h-32 bg-background rounded-sm flex flex-col items-center justify-center mb-2">
                                            <img src={p.icon} alt={p.name} className="w-[70%] h-auto rounded-md" />
                                        </div>
                                        {provider === p.id ? <button disabled={true} className="text-center text-white font-bold text-lg px-5 rounded-sm cursor-not-allowed bg-main-light/10">Linking...</button> : 
                                            p.id === "anilist" && user?.anilistId && Array.isArray(userTokens) && userTokens?.find((provider) => provider.id === p.id) ? <a href={p.oauth} className="text-center text-white font-bold text-lg px-5 rounded-sm bg-main">Linked!</a> :
                                            p.id === "mal" && user?.malId && Array.isArray(userTokens) && userTokens?.find((provider) => provider.id === p.id) ? <a href={p.oauth} className="text-center text-white font-bold text-lg px-5 rounded-sm bg-main">Linked!</a> :
                                            p.id === "simkl" && user?.simklId && Array.isArray(userTokens) && userTokens?.find((provider) => provider.id === p.id) ? <a href={p.oauth} className="text-center text-white font-bold text-lg px-5 rounded-sm bg-main">Linked!</a> :
                                            <a href={p.oauth} className="text-center text-white font-bold text-lg px-5 rounded-sm bg-main">Link</a>}
                                    </div>
                                ))}
                            </div>
                            <br />
                            <span className="text-gray-300 font-normal text-md text-left">Note: If you end up linking a provider you&apos;ve never linked before, please logout and log back in!</span>
                            <br />
                            <br />
                            <Link href="/logout" className="text-main-text text-lg font-semibold transition-all duration-200 ease-in-out hover:text-main">Logout</Link>
                        </div>
                    )}
                    {error ? (
                        <ol className={`fixed bottom-0 right-0 flex flex-col py-[25px] mr-5 w-[300px] max-w-[100vw] mt-0 list-none z-[2147483647] outline-none ${showError ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"} transition-all duration-200 ease-in-out`} style={{
                            rowGap: "10px",
                            columnGap: "10px"
                        }}>
                            <li className="bg-main-text rounded-md pt-[15px] px-2 py-2 grid grid-areas-toast grid-cols-[auto_max-content] items-center" style={{
                                columnGap: "15px"
                            }}>
                                <div className="mb-[5px] font-medium text-black text-md" style={{ gridRowStart: "title", gridColumnStart: "title", gridRowEnd: "title", gridColumnEnd: "title" }}>Error</div>
                                <span className="mt-0 text-gray-700 text-sm font-light" style={{ gridRowStart: "description", gridColumnStart: "description", gridRowEnd: "description", gridColumnEnd: "description" }}>{error}</span>
                                <button type="button" className="bg-gray-200 text-black pt-0 pr-[10px] h-[25px] text-xs px-3 border-main border-[1px] rounded-md transition-all duration-200 ease-in-out hover:bg-gray-300" style={{ gridRowStart: "action", gridColumnStart: "action", gridRowEnd: "action", gridColumnEnd: "action" }} onClick={() => {
                                    setShowError(false);
                                }}>Hide</button>
                            </li>
                        </ol>
                    ) : null}
                </div>
                <Footer />
            </main>
        </>
    )
};

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
    const { AUTH_URL } = env;

    const handleLogin = async (username: string, password: string) => {
        try {
            const response = await axios.post(`${AUTH_URL}/login`, { username, password }).catch((err) => {
                return {
                    data: err.response.data as { error: string }
                }
            });

            if (response.data?.error) return response.data as { error: string };
            
            const userId = response.data?.id as string | undefined;
            return userId;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const handleRegister = async (username: string, password: string) => {
        try {
            const response = await axios.post(`${AUTH_URL}/create-user`, { username, password }).catch((err) => {
                return {
                    data: err.response.data as { error: string }
                }
            });

            if (response.data?.error) return response.data as { error: string };

            const userId = response.data?.id as string | undefined;
            return userId;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const handleUpdateUser = async (id: string, providerId: string, provider: string) => {
        try {
            if (provider === "anilist") {
                const response = await axios.post(`${AUTH_URL}/update-user`, { id, anilistId: providerId });
                const userData = response.data as UserData;
                return userData;
            } else if (provider === "mal") {
                const response = await axios.post(`${AUTH_URL}/update-user`, { id, malId: providerId });
                const userData = response.data as UserData;
                return userData;
            } else {
                return null;
            }
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const handleProvider = async (token: string, provider: string) => {
        if (provider === "anilist") {
            const userOptions = {
                uri: "https://graphql.anilist.co",
                method: "POST",
                data: {
                    query: `
                    query {
                        Viewer {
                            id
                            name
                        }
                    }
                    `,
                    variables: {
                    }
                }
            };

            const data = await (await axios(userOptions.uri, {
                data: JSON.stringify(userOptions.data),
                method: userOptions.method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            })).data as {
                data: {
                    Viewer: {
                        id: number;
                        name: string;
                    }
                }
            };

            const user = data.data.Viewer;
            return user;
        }
        if (provider === "mal") {
            const userOptions = {
                uri: "https://api.myanimelist.net/v2/users/@me?fields=anime_statistics",
                method: "GET",
            };
        
            const data = await (await axios(userOptions.uri, {
                method: userOptions.method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            })).data as {
                id: number;
                name: string;
                gender: string;
                birthday: string;
                location: string;
                joined_at: string;
                anime_statistics: {
                    num_items_watching: number;
                    num_items_completed: number;
                    num_items_on_hold: number;
                    num_items_dropped: number;
                    num_items_plan_to_watch: number;
                    num_items: number;
                    num_days_watched: number;
                    num_days_watching: number;
                }
            };

            return data;
        }
    };

    try {
        if (query.login) {
            const { username, password } = query;
            const userId = await handleLogin(String(username), String(password));

            if (!userId || (userId as any).error) {
                return {
                    props: {
                        login: true,
                        error: String((userId as any).error ?? "An error occurred while logging in.")
                    },
                };
            }

            query.id = String(userId);
        } else if (query.register) {
            const { username, password } = query;
            const userId = await handleRegister(String(username), String(password)).catch(() => null);

            if (!userId || (userId as any).error) {
                return {
                    props: {
                        login: true,
                        error: String((userId as any).error ?? "An error occurred while logging in.")
                    },
                };
            }

            query.id = String(userId);
        }

        const providers = (await axios.get(`${AUTH_URL}/providers`)).data as AuthProviders[];

        if (query.token && typeof query.token === "string") {
            const { token, provider } = query;
        
            const userData = await handleProvider(token, String(provider));
            if (query.id) {
                const updatedUser = await handleUpdateUser(String(query.id), String(userData?.id), String(provider));
        
                return {
                    props: {
                        user: updatedUser ?? null,
                        token,
                        provider,
                        providers
                    },
                };
            } else {
                return {
                    props: {
                        redirect: true,
                        token,
                        provider,
                        providers
                    },
                };
            }
        }

        if (!query.id) {
            // Login
            return {
                props: {
                    login: true
                }
            }
        }

        const response = await axios.get(`${AUTH_URL}/user?id=${String(query.id)}`);
        const userData = response.data as UserData;

        return {
            props: {
                user: userData ?? null,
                token: query.token ?? null,
                provider: query.provider ?? null,
                providers,
            },
        };
    } catch (error) {
        console.error(error);
        return {
            props: {},
        };
    }
};

export default Login;

interface Props {
    user?: UserData;
    token?: string;
    provider?: string;
    providers: AuthProviders[];
    redirect?: boolean;
    login?: boolean;
    error?: string;
}
