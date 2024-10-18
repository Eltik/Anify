/**
 * @fileoverview Helper functions
 */

export function wait(time: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

export function substringBefore(str: string, toFind: string) {
    const index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(0, index);
}

export function substringAfter(str: string, toFind: string) {
    const index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(index + toFind.length);
}

export function isString(object: unknown): object is string {
    return typeof object === "string";
}

export function setIntervalImmediately(func: () => Promise<void>, interval: number) {
    func();
    return setInterval(async () => {
        try {
            await func();
        } catch (e) {
            console.error("Error occurred while trying to execute the interval function: ", e);
        }
    }, interval);
}

export const averageMetric = (object: any) => {
    let average = 0,
        validCount = 0;
    if (!object) return 0;

    for (const [, v] of Object.entries(object)) {
        if (v && typeof v === "number") {
            average += v;
            validCount++;
        }
    }

    return validCount === 0 ? 0 : Number.parseFloat((average / validCount).toFixed(2));
};

export const serializeText = (t: string) => {
    return "".concat(b64encode(t)).replace(/\//g, "_").replace(/\+/g, "-");
};

export const rc4Cypher = (key: string, data: string) => {
    let n;
    const r: any[] = [];
    // eslint-disable-next-line no-var
    var s = 0;
    let o = "";
    for (let u = 0; u < 256; u++) {
        r[u] = u;
    }
    for (let u = 0; u < 256; u++) {
        // console.log(t);
        s = (s + r[u] + key.charCodeAt(u % key.length)) % 256;
        n = r[u];
        r[u] = r[s];
        r[s] = n;
    }
    let u = 0;
    // eslint-disable-next-line no-var
    var s = 0;
    for (let h = 0; h < data.length; h++) {
        n = r[(u = (u + 1) % 256)];
        r[u] = r[(s = (s + r[u]) % 256)];
        r[s] = n;
        o += String.fromCharCode(data.charCodeAt(h) ^ r[(r[u] + r[s]) % 256]);
    }
    return o;
};

export const b64encode = (data: string): string => {
    data = "".concat(data);
    for (let s = 0; s < data.length; s++) {
        if (255 < data.charCodeAt(s)) {
            return null!;
        }
    }
    let r = "";
    for (let s = 0; s < data.length; s += 3) {
        const o: any[] = [undefined, undefined, undefined, undefined];
        o[0] = data.charCodeAt(s) >> 2;
        o[1] = (3 & data.charCodeAt(s)) << 4;
        if (data.length > s + 1) {
            o[1] |= data.charCodeAt(s + 1) >> 4;
            o[2] = (15 & data.charCodeAt(s + 1)) << 2;
        }
        if (data.length > s + 2) {
            o[2] |= data.charCodeAt(s + 2) >> 6;
            o[3] = 63 & data.charCodeAt(s + 2);
        }
        for (let u = 0; u < o.length; u++) {
            r +=
                "undefined" == typeof o[u]
                    ? "="
                    : (function (t) {
                          if (0 <= t && t < 64) {
                              return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[t];
                          }
                      })(o[u]);
        }
    }
    return r;
};

export const b64decode = (t: string) => {
    if ((t = (t = (t = "".concat(t)).replace(/[\t\n\f\r]/g, "")).length % 4 == 0 ? t.replace(/==?$/, "") : t).length % 4 == 1 || /[^+/0-9A-Za-z]/.test(t)) {
        return null!;
    }
    let r;
    let s = "";
    let o = 0;
    let u = 0;
    for (let h = 0; h < t.length; h++) {
        r = t[h];
        o = (o <<= 6) | ((r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(r)) < 0 ? undefined : r)!;
        if (24 === (u += 6)) {
            s = (s = (s += String.fromCharCode((16711680 & o) >> 16)) + String.fromCharCode((65280 & o) >> 8)) + String.fromCharCode(255 & o);
            o = u = 0;
        }
    }
    if (12 === u) {
        o >>= 4;
        s += String.fromCharCode(o);
    } else if (18 === u) {
        o >>= 2;
        s = (s += String.fromCharCode((65280 & o) >> 8)) + String.fromCharCode(255 & o);
    }
    return s;
};
