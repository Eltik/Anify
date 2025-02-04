/**
 * @author Toasty360 & Dungeon69
 * @description Animekai Decoder. This is the modified and type-safe version of the original decoder which is by Dungeon69.
 * @link https://github.com/Toasty360/wasm/tree/main/animekai.to
 * @link https://github.com/Dungeon69/Junk/blob/master/Completed/animekai.to/decoder.js
 */

let wasm: unknown;


const cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0: Uint8Array | null = null;

function getUint8ArrayMemory0(): Uint8Array {
  if (
    cachedUint8ArrayMemory0 === null ||
    cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array((wasm as { memory: { buffer: ArrayBuffer } }).memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr: number, len: number): string {
  const adjustedPtr = ptr >>> 0;
  return cachedTextDecoder.decode(
    getUint8ArrayMemory0().subarray(adjustedPtr, adjustedPtr + len)
  );
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = new TextEncoder();

const encodeString = (
  typeof cachedTextEncoder.encodeInto === "function"
    ? (arg: string, view: Uint8Array) => {
        return cachedTextEncoder.encodeInto(arg, view);
      }
    : (arg: string, view: Uint8Array) => {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
          read: arg.length,
          written: buf.length,
        };
      }
);

function passStringToWasm0(
  arg: string,
  malloc: (size: number, align: number) => number,
  realloc?: (ptr: number, oldSize: number, newSize: number, align: number) => number
): number {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  const initialLen = arg.length;
  let ptr = malloc(initialLen, 1) >>> 0;
  let currentArg = arg;
  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < initialLen; offset++) {
    const code = currentArg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }

  if (offset !== initialLen) {
    if (offset !== 0) {
      currentArg = currentArg.slice(offset);
    }
    const newLen = offset + currentArg.length * 3;
    ptr = realloc(ptr, initialLen, newLen, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + newLen);
    const ret = encodeString(currentArg, view);

    offset += ret.written;
    ptr = realloc(ptr, newLen, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

const AnimekaiDecoderFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr: number) =>
        (wasm as {
            __wbg_animekaidecoder_free: (ptr: number, size: number) => void
        }).__wbg_animekaidecoder_free(ptr >>> 0, 1)
      );

class AnimekaiDecoder {
  private __wbg_ptr = 0;

  __destroy_into_raw(): number {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    AnimekaiDecoderFinalization.unregister(this);
    return ptr;
  }

  free(): void {
    const ptr = this.__destroy_into_raw();
    (wasm as {
      __wbg_animekaidecoder_free: (ptr: number, size: number) => void
    }).__wbg_animekaidecoder_free(ptr, 0);
  }


  static generate_token(n: string): string {
    let deferred2_0 = 0;
    let deferred2_1 = 0;
    try {
      const ptr0 = passStringToWasm0(
        n,
        (wasm as {
          __wbindgen_malloc: (size: number, align: number) => number
        }).__wbindgen_malloc,
        (wasm as {
          __wbindgen_realloc: (ptr: number, oldSize: number, newSize: number, align: number) => number
        }).__wbindgen_realloc

      );
      const len0 = WASM_VECTOR_LEN;
      const ret = (wasm as {
        animekaidecoder_generate_token: (ptr: number, len: number) => [number, number]
      }).animekaidecoder_generate_token(ptr0, len0);
      deferred2_0 = ret[0];
      deferred2_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);

    } finally {
      (wasm as {
        __wbindgen_free: (ptr: number, size: number, align: number) => void
      }).__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }


  static decode_iframe_data(n: string): string {
    let deferred2_0 = 0;
    let deferred2_1 = 0;
    try {
      const ptr0 = passStringToWasm0(
        n,
        (wasm as {
          __wbindgen_malloc: (size: number, align: number) => number
        }).__wbindgen_malloc,
        (wasm as {
          __wbindgen_realloc: (ptr: number, oldSize: number, newSize: number, align: number) => number
        }).__wbindgen_realloc
      );
      const len0 = WASM_VECTOR_LEN;

      const ret = (wasm as {
        animekaidecoder_decode_iframe_data: (ptr: number, len: number) => [number, number]
      }).animekaidecoder_decode_iframe_data(ptr0, len0);
      deferred2_0 = ret[0];
      deferred2_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);

    } finally {
      (wasm as {
        __wbindgen_free: (ptr: number, size: number, align: number) => void
      }).__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }


  static decode(n: string): string {
    let deferred2_0 = 0;
    let deferred2_1 = 0;
    try {
      const ptr0 = passStringToWasm0(
        n,
        (wasm as {
          __wbindgen_malloc: (size: number, align: number) => number
        }).__wbindgen_malloc,
        (wasm as {
          __wbindgen_realloc: (ptr: number, oldSize: number, newSize: number, align: number) => number
        }).__wbindgen_realloc
      );
      const len0 = WASM_VECTOR_LEN;

      const ret = (wasm as {
        animekaidecoder_decode: (ptr: number, len: number) => [number, number]
      }).animekaidecoder_decode(ptr0, len0);
      deferred2_0 = ret[0];
      deferred2_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);

    } finally {
      (wasm as {
        __wbindgen_free: (ptr: number, size: number, align: number) => void
      }).__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
}


function getImports() {
  return {
    __wbindgen_placeholder__: {
      __wbindgen_init_externref_table: () => {
        const table = (wasm as {
          __wbindgen_export_0: {
            grow: (size: number) => number;
            set: (index: number, value: unknown) => void;
          };
        }).__wbindgen_export_0;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);

      },
      __wbindgen_throw: (arg0: number, arg1: number) => {
        throw new Error(getStringFromWasm0(arg0, arg1));
      },
    },
  };
}

async function initWasm(wasmModule: WebAssembly.Module | ArrayBuffer): Promise<WebAssembly.Instance> {
  const imports = getImports();

  const module = wasmModule instanceof WebAssembly.Module
    ? wasmModule
    : new WebAssembly.Module(wasmModule);

  const instance = new WebAssembly.Instance(module, imports);
  wasm = instance.exports;

  if (typeof (wasm as {
    __wbindgen_start: () => void
  }).__wbindgen_start === "function") {
    (wasm as {
      __wbindgen_start: () => void
    }).__wbindgen_start();
  }



  return wasm as WebAssembly.Instance;
}

const wasmResponse = await fetch(
  "https://github.com/Toasty360/wasm/raw/refs/heads/main/animekai.to/animekai_bg.wasm"
);
const arrayBuffer = await wasmResponse.arrayBuffer();
initWasm(arrayBuffer);

export default AnimekaiDecoder;