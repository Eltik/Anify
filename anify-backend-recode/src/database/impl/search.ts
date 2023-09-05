import { db } from "..";
import { Format, Type } from "../../types/enums";

export const search = async (query: string, type: Type, formats: Format[], page: number, perPage: number) => {
    const skip = page > 0 ? perPage * (page - 1) : 0;
    const where = `
        WHERE
        (
            '%${query}%' IN (synonyms)
            OR title->>'english' LIKE '%${query}%'
            OR title->>'romaji' LIKE '%${query}%'
            OR title->>'native' LIKE '%${query}%'
            OR synonyms LIKE '%${query}%'
        )
        ${formats?.length > 0 ? `AND "format" IN (${formats.map(f => `'${f}'`).join(', ')})` : ''}
    `;

    const data = await db.query(`SELECT * FROM ${type === Type.ANIME ? "anime" : "manga"} ${where} ORDER BY title->>'english' ASC LIMIT ${perPage} OFFSET ${skip}`).all();
    return data;
};