import { PrismaClient } from "@prisma/client";
import { Settings } from "../types";
import { dehashPassword } from "@/src/helper";

export const prisma = new PrismaClient();

export const insertUser = async (ids: IDs, username: string, password: string, salt: string) => {
    // Check if user already exists
    if (
        await prisma.user.findUnique({
            where: {
                username,
            },
        })
    ) {
        return null;
    }

    return await prisma.user.create({
        data: {
            username,
            password,
            salt,
            anilistId: ids.anilistId,
            malId: ids.malId,
            simklId: ids.simklId,
            settings: {
                create: {
                    autoSkip: false,
                    autoNext: false,
                    autoFullscreen: false,
                    airingNotifications: false,
                    displayAdultContent: false,
                    titleLanguage: "english",
                    fontSize: "1rem 1.5rem",
                    fontWidth: "200",
                    updatedAt: new Date(Date.now()),
                    createdAt: new Date(Date.now()),
                },
            },
        },
    });
};

export const updateUser = async (id: string, ids: IDs) => {
    return await prisma.user.update({
        where: {
            id,
        },
        data: {
            anilistId: ids.anilistId,
            malId: ids.malId,
            simklId: ids.simklId,
        },
    });
};

export const fetchUser = async (id: string) => {
    return await prisma.user.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            anilistId: true,
            malId: true,
            lists: true,
            settings: true,
            username: true,
            simklId: true,
            password: false,
            salt: false,
        },
    });
};

export const login = async (username: string, password: string) => {
    const user = await prisma.user.findUnique({
        where: {
            username,
        },
    });

    if (!user) return null;

    const valid = await dehashPassword(password, user.password);
    if (!valid) return null;

    // Remove password and salt from user object
    return await prisma.user.findUnique({
        where: {
            username,
        },
        select: {
            id: true,
            anilistId: true,
            malId: true,
            lists: true,
            settings: true,
            username: true,
            simklId: true,
            password: false,
            salt: false,
        },
    });
};

export const fetchSettings = async (id: string) => {
    return await prisma.userSettings.findUnique({
        where: {
            userId: id,
        },
    });
};

export const updateSettings = async (
    id: string,
    settings: Settings = {
        autoSkip: false,
        autoNext: false,
        autoFullscreen: false,
        fontSize: "1rem 1.5rem",
        fontWidth: "200",
        titleLanguage: "english",
        displayAdultContent: false,
        airingNotifications: false,
    }
) => {
    return await prisma.userSettings.update({
        where: {
            userId: id,
        },
        data: {
            autoSkip: settings.autoSkip,
            autoNext: settings.autoNext,
            autoFullscreen: settings.autoFullscreen,
            fontSize: settings.fontSize,
            fontWidth: settings.fontWidth,
            titleLanguage: settings.titleLanguage,
            displayAdultContent: settings.displayAdultContent,
            airingNotifications: settings.airingNotifications,
            updatedAt: new Date(Date.now()),
        },
    });
};

interface IDs {
    anilistId?: string;
    malId?: string;
    simklId?: string;
}
