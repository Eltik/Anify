/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ImageResponse } from "@vercel/og";
import sanitizer from "sanitize-html";
import { env } from "~/env.mjs";
import { type Anime, type Manga } from "~/types";

export const textSanitizer = (textWithHTML:string) => {
    return sanitizer(textWithHTML, {
        allowedTags: [],
    });
};

export const config = {
    runtime: "edge",
};

const getDetails = async (id:string): Promise<Anime | Manga> => {
    const data: Anime | Manga = await (await fetch(`${env.BACKEND_URL}/info/${id}?apikey=${env.API_KEY}`)).json();
    return data;
};

function capitalize(s:string) {
  s = s.toLowerCase();
  return s && String(s[0]?.toUpperCase()) + s.slice(1);
}

const RegularFont = fetch(
    new URL("../../../fonts/Inter-Bold.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

export default async function handler(req: { url: string; }) {
    try {
        const RegularFontData = await RegularFont;
        const { searchParams } = new URL(decodeURIComponent(req.url));

        const id = searchParams.has("id") ? searchParams.get("id") : null;

        if (!id) {
            return new Response(`Missing id`, { status: 400, });
        }

        const data = await getDetails(id);

        if (!data) return new Response(`Missing data`, { status: 400 });

        const {
            bannerImage,
            genres,
            coverImage,
            averageRating,
            year,
            status
        } = data;

        const title = (data.title?.english || data.title?.romaji || data.title?.native || "Unknown").replace(/[\u{0080}-\u{10FFFF}]/gu, "");

        const color = "rgb(76, 184, 117)";

        const titleLength = 80;

        return new ImageResponse(
            (
                <div style={{
                    width: "1200px", height: "628px", position: "relative", display: "flex"
                }}>
                    <div className="bg" style={{
                            width: "1200px",
                            height: "628px",
                            backgroundImage: `url(${bannerImage ?? ""})`,
                            position: "absolute",
                            zIndex: "0",
                            filter: "blur(13px)",
                            WebkitBackdropFilter: "blur(5px)"
                        }}
                    />
                    <div className="bg" style={{
                        width: "800px",
                        height: "100%",
                        backgroundColor: `rgba(0,0,0,0.7)`,
                        position: "absolute",
                        zIndex: "1",
                        top: "0",
                        left: "0",
                        paddingLeft: "50px",
                        paddingTop: "30px",
                        paddingBottom: "20px",
                        display: "flex",
                        flexDirection: "column",
                    }}>
                    <h4 className="episodeCount" style={{
                        color: "white",
                        opacity: "0.7",
                        fontSize: "24px",
                        marginBottom: "0",
                    }}>
                        {capitalize(status ?? "")}
                        {year}
                    </h4>
                    <h4 className="animeTitle" style={{
                        color: "white",
                        fontSize: "50px",
                        width: "90%",
                        marginBottom: "0",
                    }}>
                        {title.length > titleLength ? title.substring(0, 80) + "..." : title}
                    </h4>
                    <h4 className="studio" style={{
                        fontWeight: "500",
                        color: color,
                        fontSize: "34px",
                        marginBottom: "0",
                        marginTop: 0,
                    }}>
                        {data.status && data.format ? `${capitalize(data.status as string)} · ${capitalize(data.format as string)}` : capitalize(data.format as string)}
                    </h4>
                    <div className="ratingWrapper" style={{
                        display: "flex",
                        fontSize: "45px",
                        alignItems: "center",
                        marginTop: "auto",
                        gap: "15px",
                        marginBottom: "15px",
                        fontWeight: "600",
                        color: "white",
                        fill: color,
                    }}>
                        <svg width="55px" height="55px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill={color}>
                            <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z" />
                        </svg>
                        <span>{averageRating ? String(Math.round(averageRating * 10)) + "%" : "?"}</span>
                    </div>
                    <div className="genreWrapper" style={{
                        display: "flex",
                        gap: "8px",
                        width: "90%",
                        flexWrap: "wrap",
                    }}>
                        {genres?.splice(0, 4)?.map((genre: any) => (
                        <div className="genre" style={{
                            background: "rgba(80, 80, 80)",
                            padding: "4px 15px",
                            fontSize: "24px",
                            borderRadius: "50px",
                            color: "white",
                            fontFamily: "Oswald-Regular",
                            fontWeight: "200",
                        }} key={genre}>
                            {genre}
                        </div>
                        ))}
                    </div>
                    </div>
                    <img className="image" src={coverImage ?? ""} style={{
                        width: "400px",
                        height: "100%",
                        position: "absolute",
                        objectFit: "cover",
                        zIndex: "1",
                        top: "0",
                        right: "0",
                        boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                    }} />
                </div>
            ),
            {
                width: 1200,
                height: 628,
                fonts: [
                    {
                        name: "Inter-Bold",
                        data: RegularFontData,
                        style: "normal",
                    },
                ],
            }
        );
    } catch (e) {
        console.error(e);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}