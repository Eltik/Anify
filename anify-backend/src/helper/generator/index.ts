import { Genres } from "@/src/mapping";

export function anilistMediaGenerator(data: any) {
    return {
        aniListId: data.id,
        malId: data.idMal,
        title: {
            english: data.title.english ?? null,
            romaji: data.title.romaji ?? null,
            native: data.title.native ?? null,
        },
        coverImage: data.coverImage.extraLarge ?? null,
        bannerImage: data.bannerImage ?? null,
        popularity: Number(data.popularity),
        synonyms: data.synonyms ?? [],
        totalChapters: data.chapters ?? 0,
        totalVolumes: data.volumes ?? 0,
        color: null,
        status: data.status,
        genres: (data.genres as Genres[]) ?? [],
        rating: data.meanScore ? data.meanScore / 10 : null,
        description: data.description ?? null,
        format: data.format,
        countryOfOrigin: data.countryOfOrigin ?? null,
        year: data.seasonYear ?? data.startDate?.year ?? null,
        type: data.type,
        tags: data.tags.map((tag) => tag.name),
    };
}

export function generateQueryBuilder(id: string) {
    return `
    anime${id}:Page(page: 0, perPage: 10){
        media(id:${id}){
            id
            idMal
            title {
                romaji
                english
                native
                userPreferred
            }
            coverImage {
                extraLarge
                large
                color
            }
            bannerImage
            startDate {
                year
                month
                day
            }
            endDate {
                year
                month
                day
            }
            description
            season
            seasonYear
            type
            format
            status(version: 2)
            episodes
            duration
            chapters
            volumes
            genres
            synonyms
            source(version: 3)
            isAdult
            meanScore
            averageScore
            popularity
            favourites
            countryOfOrigin
            isLicensed
            relations {
                edges {
                    id
                    relationType(version: 2)
                    node {
                        id
                        title {
                            userPreferred
                        }
                        format
                        type
                        status(version: 2)
                        bannerImage
                        coverImage {
                            large
                        }
                    }
                }
            }
            streamingEpisodes {
                title
                thumbnail
                url
            }
            trailer {
                id
                site
            }
            tags {
                id
                name
            }
        }
    }
    `;
}
