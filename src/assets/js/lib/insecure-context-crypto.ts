/**
 * `crypto.subtle` is only available in secure contexts (https / localhost),
 * so the POW captcha (crypto-puzzle -> tiny-encryptor / crypto-sha) breaks
 * when the admin panel is served over plain http.
 *
 * `ensureSubtleCrypto()` installs a minimal pure-JS fallback implementing only
 * the operations crypto-puzzle needs: SHA-256 digest, PBKDF2-HMAC-SHA256
 * deriveBits and AES-GCM encrypt/decrypt. The asmcrypto.js implementation is
 * loaded dynamically, so secure contexts never download it.
 */

type FallbackKey = {
    __raw: Uint8Array;
    algorithm: { name: string };
    usages: string[];
    type: 'secret';
    extractable: false;
};

function toBytes(data: BufferSource): Uint8Array {
    if (data instanceof Uint8Array) return data;
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return new Uint8Array(data);
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.slice().buffer;
}

function algoName(algorithm: string | { name: string }): string {
    return (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase();
}

let installed: Promise<void> | undefined;

export function ensureSubtleCrypto(): Promise<void> {
    if (typeof crypto === 'undefined' || crypto.subtle) return Promise.resolve();
    installed ??= installFallback();
    return installed;
}

async function installFallback(): Promise<void> {
    const { SHA256, PBKDF2_HMAC_SHA256, AES_GCM } = await import('asmcrypto.js');

    const subtleFallback = {
        async digest(algorithm: string | { name: string }, data: BufferSource): Promise<ArrayBuffer> {
            if (algoName(algorithm) !== 'SHA-256') throw new Error(`Unsupported digest algorithm: ${algoName(algorithm)}`);
            return toBuffer(SHA256.bytes(toBytes(data)));
        },

        async importKey(
            format: string,
            keyData: BufferSource,
            algorithm: string | { name: string },
            _extractable: boolean,
            usages: string[],
        ): Promise<FallbackKey> {
            if (format !== 'raw') throw new Error(`Unsupported key format: ${format}`);
            return {
                __raw: toBytes(keyData).slice(),
                algorithm: { name: algoName(algorithm) },
                usages,
                type: 'secret',
                extractable: false,
            };
        },

        async deriveBits(
            params: { name: string; salt: BufferSource; iterations: number; hash: string | { name: string } },
            key: FallbackKey,
            length: number,
        ): Promise<ArrayBuffer> {
            if (algoName(params) !== 'PBKDF2' || algoName(params.hash) !== 'SHA-256') {
                throw new Error(`Unsupported deriveBits params: ${algoName(params)}/${algoName(params.hash)}`);
            }
            return toBuffer(PBKDF2_HMAC_SHA256.bytes(key.__raw, toBytes(params.salt), params.iterations, length / 8));
        },

        async encrypt(
            params: { name: string; iv: BufferSource; tagLength?: number },
            key: FallbackKey,
            data: BufferSource,
        ): Promise<ArrayBuffer> {
            if (algoName(params) !== 'AES-GCM') throw new Error(`Unsupported encrypt algorithm: ${algoName(params)}`);
            return toBuffer(AES_GCM.encrypt(toBytes(data), key.__raw, toBytes(params.iv), undefined, (params.tagLength ?? 128) / 8));
        },

        async decrypt(
            params: { name: string; iv: BufferSource; tagLength?: number },
            key: FallbackKey,
            data: BufferSource,
        ): Promise<ArrayBuffer> {
            if (algoName(params) !== 'AES-GCM') throw new Error(`Unsupported decrypt algorithm: ${algoName(params)}`);
            return toBuffer(AES_GCM.decrypt(toBytes(data), key.__raw, toBytes(params.iv), undefined, (params.tagLength ?? 128) / 8));
        },
    };

    Object.defineProperty(crypto, 'subtle', {
        value: subtleFallback,
        configurable: true,
    });
}
