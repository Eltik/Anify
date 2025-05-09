import type { IRequestConfig } from "../../../../types/impl/proxies";

const isGoogleTranslate = (options: IRequestConfig = {}): boolean => {
    return options.useGoogleTranslate ?? false;
};

const googleTranslate = async (url: string, options: IRequestConfig = {}): Promise<Response | null> => {
    const { useGoogleTranslate, validateResponse } = options;

    if (useGoogleTranslate) {
        const translatedUrl = `http://translate.google.com/translate?sl=ja&tl=en&u=${encodeURIComponent(url)}`;
        const response = await fetch(translatedUrl, options);

        if (response && (!validateResponse || (await validateResponse(response.clone() as Response)))) {
            return response;
        }
    }

    return null;
};

export default {
    googleTranslate,
    isGoogleTranslate,
};
