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

    const userData = useStore(useUserData, (state: any) => state.userData as UserData);
    const userTokens = useStore(useTokens, (state: any) => state.tokens as UserTokens[]);

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
    });

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
                <div className="mx-auto mb-8 mt-24 md:ml-24 md:mr-6">
                    {login ? (
                        <div className="mx-auto w-full max-w-[400px] rounded-md bg-background-light p-14 text-center text-white">
                            <h1 className="mb-14 text-3xl font-semibold text-main">{createAccount ? "Create Account" : "Login"}</h1>
                            <form
                                className="mb-4"
                                onSubmit={(event) => {
                                    const username = String((event.target as any)[0].value);
                                    const password = String((event.target as any)[1].value);

                                    if (createAccount) {
                                        window.location.href = "/login?register=true&username=" + username + "&password=" + password;
                                    } else {
                                        window.location.href = "/login?login=true&username=" + username + "&password=" + password;
                                    }
                                    event.preventDefault();
                                }}
                            >
                                <input placeholder="Username" className="mb-3 h-[40px] w-full rounded-md border-0 bg-background p-[0_15px] text-main-text shadow-none outline-none" autoComplete="off" />
                                <input placeholder="Password" className="h-[40px] w-full rounded-md border-0 bg-background p-[0_15px] text-main-text shadow-none outline-none" autoComplete="off" type="password" />
                                <button type="submit" className="mt-[10px] inline-block cursor-pointer rounded-md bg-main p-[10px_30px] text-sm transition-all duration-200 ease-in-out hover:bg-main-dark">
                                    {createAccount ? "Create Account" : "Login"}
                                </button>
                            </form>
                            {!createAccount ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateAccount(true);
                                    }}
                                    className="text-sm text-main-text"
                                >
                                    Not registered? <span className="text-main">Create an account</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateAccount(false);
                                    }}
                                    className="text-sm text-main-text"
                                >
                                    Already registered? <span className="text-main">Login</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mx-auto bg-background-light/30 px-5 py-5 text-center lg:max-w-[90%]">
                            <h1 className="text-3xl font-bold text-white">Providers</h1>
                            <br />
                            <p className="text-white">NOTE: Logging in doesn&apos;t work at the moment.</p>
                            <div className="flex flex-row flex-wrap items-center justify-center gap-5">
                                {providers?.map((p, index) => (
                                    <div key={index} className="flex flex-col items-center justify-center">
                                        <div className="mb-2 flex h-32 w-32 flex-col items-center justify-center rounded-sm bg-background">
                                            <img src={p.icon} alt={p.name} className="h-auto w-[70%] rounded-md" />
                                        </div>
                                        {provider === p.id ? (
                                            <button disabled={true} className="cursor-not-allowed rounded-sm bg-main-light/10 px-5 text-center text-lg font-bold text-white">
                                                Linking...
                                            </button>
                                        ) : p.id === "anilist" && user?.anilistId && Array.isArray(userTokens) && userTokens?.find((provider) => provider.id === p.id) ? (
                                            <a href={p.oauth} className="rounded-sm bg-main px-5 text-center text-lg font-bold text-white">
                                                Linked!
                                            </a>
                                        ) : p.id === "mal" && user?.malId && Array.isArray(userTokens) && userTokens?.find((provider) => provider.id === p.id) ? (
                                            <a href={p.oauth} className="rounded-sm bg-main px-5 text-center text-lg font-bold text-white">
                                                Linked!
                                            </a>
                                        ) : p.id === "simkl" && user?.simklId && Array.isArray(userTokens) && userTokens?.find((provider) => provider.id === p.id) ? (
                                            <a href={p.oauth} className="rounded-sm bg-main px-5 text-center text-lg font-bold text-white">
                                                Linked!
                                            </a>
                                        ) : (
                                            <a href={p.oauth} className="rounded-sm bg-main px-5 text-center text-lg font-bold text-white">
                                                Link
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <br />
                            <span className="text-md text-left font-normal text-gray-300">Note: If you end up linking a provider you&apos;ve never linked before, please logout and log back in!</span>
                            <br />
                            <br />
                            <Link href="/logout" className="text-lg font-semibold text-main-text transition-all duration-200 ease-in-out hover:text-main">
                                Logout
                            </Link>
                        </div>
                    )}
                    {error ? (
                        <ol
                            className={`fixed bottom-0 right-0 z-[2147483647] mr-5 mt-0 flex w-[300px] max-w-[100vw] list-none flex-col py-[25px] outline-none ${showError ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"} transition-all duration-200 ease-in-out`}
                            style={{
                                rowGap: "10px",
                                columnGap: "10px",
                            }}
                        >
                            <li
                                className="grid grid-cols-[auto_max-content] items-center rounded-md bg-main-text px-2 py-2 pt-[15px] grid-areas-toast"
                                style={{
                                    columnGap: "15px",
                                }}
                            >
                                <div className="text-md mb-[5px] font-medium text-black" style={{ gridRowStart: "title", gridColumnStart: "title", gridRowEnd: "title", gridColumnEnd: "title" }}>
                                    Error
                                </div>
                                <span className="mt-0 text-sm font-light text-gray-700" style={{ gridRowStart: "description", gridColumnStart: "description", gridRowEnd: "description", gridColumnEnd: "description" }}>
                                    {error}
                                </span>
                                <button
                                    type="button"
                                    className="h-[25px] rounded-md border-[1px] border-main bg-gray-200 px-3 pr-[10px] pt-0 text-xs text-black transition-all duration-200 ease-in-out hover:bg-gray-300"
                                    style={{ gridRowStart: "action", gridColumnStart: "action", gridRowEnd: "action", gridColumnEnd: "action" }}
                                    onClick={() => {
                                        setShowError(false);
                                    }}
                                >
                                    Hide
                                </button>
                            </li>
                        </ol>
                    ) : null}
                </div>
                <Footer />
            </main>
        </>
    );
};

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
    const AUTH_URL = env.AUTH_URL ?? "";

    const handleLogin = async (username: string, password: string) => {
        try {
            const response = await axios.post(`${AUTH_URL}/login`, { username, password }).catch((err) => {
                return {
                    data: err.response.data as { error: string },
                };
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
                    data: err.response.data as { error: string },
                };
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
                    variables: {},
                },
            };

            const request = await axios(userOptions.uri, {
                data: JSON.stringify(userOptions.data),
                method: userOptions.method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            });

            const data = request.data as {
                data: {
                    Viewer: {
                        id: number;
                        name: string;
                    };
                };
            };

            const user = data.data.Viewer;
            return user;
        }
        if (provider === "mal") {
            const userOptions = {
                uri: "https://api.myanimelist.net/v2/users/@me?fields=anime_statistics",
                method: "GET",
            };

            const data = (
                await axios(userOptions.uri, {
                    method: userOptions.method,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                })
            ).data as unknown as {
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
                };
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
                        error: String((userId as any).error ?? "An error occurred while logging in."),
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
                        error: String((userId as any).error ?? "An error occurred while logging in."),
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
                        providers,
                    },
                };
            } else {
                return {
                    props: {
                        redirect: true,
                        token,
                        provider,
                        providers,
                    },
                };
            }
        }

        if (!query.id) {
            // Login
            return {
                props: {
                    login: true,
                },
            };
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
