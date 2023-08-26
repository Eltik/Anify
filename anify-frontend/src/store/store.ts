import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type WatchTime, type UserData, type UserTokens, type ReadHistory } from "~/types";

export const useWatchTime = create(
    persist((set, get) => ({
        currentTime: [],
        setTime: (currentTime: WatchTime[]) => set({ currentTime })
    }),
    {
        name: "currentTime"
    }
))

export const useReadHistory = create(
    persist((set, get) => ({
        readHistory: [],
        setHistory: (readHistory: ReadHistory[]) => set({ readHistory })
    }),
    {
        name: "readHistory"
    }
))

export const useAutoSkip = create(
    persist((set, get) => ({
        autoSkip: false,
        setAutoSkip: (autoSkip: boolean) => set({ autoSkip })
    }),
    {
        name: "autoSkip",
    }
))

export const useAutoNext = create(
    persist((set, get) => ({
        autoNext: false,
        setAutoNext: (autoNext: boolean) => set({ autoNext })
    }),
    {
        name: "autoNext"
    }
))

export const useAutoFullscreen = create(
    persist((set, get) => ({
        fullscreen: false,
        setAutoFullscren: (autoFullscreen: boolean) => set({ autoFullscreen })
    }),
    {
        name: "autoFullscreen"
    }
))

export const useSubtitles = create(
    persist((set, get) => ({
        subtitles: false,
        setSubtitles: (subtitles: boolean) => set({ subtitles })
    }),
    {
        name: "useSubtitles"
    }
))

export const useSpeed = create(
    persist((set, get) => ({
        speed: 1,
        setSpeed: (speed: number) => set({ speed })
    }),
    {
        name: "speed"
    }
))

export const useFontSize = create(
    persist((set, get) => ({
        fontSize: "1rem 1.5rem",
        setFontSize: (fontSize: string) => set({ fontSize })
    }),
    {
        name: "fontSize"
    }
))

export const usePageSize = create(
    persist((set, get) => ({
        pageSize: "50vw",
        setPageSize: (pageSize: string) => set({ pageSize })
    }),
    {
        name: "pageSize"
    }
))

export const useFontWidth = create(
    persist((set, get) => ({
        fontWidth: "200",
        setFontWidth: (fontWidth: string) => set({ fontWidth })
    }),
    {
        name: "fontWidth"
    }
))

export const useHeaderBackground = create(
    persist((set, get) => ({
        headerBackground: true,
        setHeaderBackground: (headerBackground: boolean) => set({ headerBackground })
    }),
    {
        name: "headerBackground"
    }
))

export const useUserData = create(
    persist((set) => ({
        user: {},
        setUser: (user: UserData) => set({ user }),
    }),
    {
        name: "userData"
    }
))

export const useTokens = create(
    persist((set) => ({
        tokens: [],
        setTokens: (tokens: UserTokens[]) => set({ tokens }),
    }),
    {
        name: "userTokens"
    }
))

export const usePreferredList = create(
    persist((set) => ({
        preferredList: "anilist",
        setPreferredList: (preferredList: string) => set({ preferredList }),
    }),
    {
        name: "preferredList"
    }
))