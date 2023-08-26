export function clean(title: string) {
    return transformSpecificVariations(
        removeSpecialChars(
            title
                ?.replaceAll(/[^A-Za-z0-9!@#$%^&*() ]/gim, " ")
                .replaceAll(/(th|rd|nd|st) (Season|season)/gim, "")
                .replaceAll(/\([^\(]*\)$/gim, "")
                .replaceAll("season", "")
                .replaceAll("  ", " ")
                .replaceAll('"', "")
                .trimEnd()
        )
    );
}

export function removeSpecialChars(title: string) {
    return title
        ?.replaceAll(/[^A-Za-z0-9!@#$%^&*()\-= ]/gim, " ")
        .replaceAll(/[^A-Za-z0-9\-= ]/gim, "")
        .replaceAll("  ", " ");
}

export function transformSpecificVariations(title: string) {
    return title?.replaceAll("yuu", "yu").replaceAll(" ou", " oh");
}
