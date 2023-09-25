import AuthProvider from "./impl";
import AniList from "./impl/anilist";
import MAL from "./impl/mal";
import Simkl from "./impl/simkl";

const AUTH_PROVIDERS: AuthProvider[] = [new AniList(), new MAL(), new Simkl()];
const authProviders: Record<string, AuthProvider> = AUTH_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, AuthProvider>,
);

const providerRoutes = AUTH_PROVIDERS.map((x) => {
    return { controller: x.routes, prefix: x.id };
});

export { AUTH_PROVIDERS, authProviders, providerRoutes };
