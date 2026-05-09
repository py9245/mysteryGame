import { randomBytes, timingSafeEqual } from "node:crypto";

const PASSWORD_SCHEME = "pbkdf2-sha256";
const PASSWORD_ITERATIONS = 160_000;
const PASSWORD_KEY_LENGTH_BYTES = 32;

function encodeBase64(value: Uint8Array): string {
  return Buffer.from(value).toString("base64");
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

async function derivePasswordKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    keyMaterial,
    PASSWORD_KEY_LENGTH_BYTES * 8,
  );

  return new Uint8Array(derivedBits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await derivePasswordKey(
    password,
    salt,
    PASSWORD_ITERATIONS,
  );

  return [
    PASSWORD_SCHEME,
    String(PASSWORD_ITERATIONS),
    encodeBase64(salt),
    encodeBase64(derivedKey),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [scheme, iterationsValue, saltValue, derivedKeyValue] =
    storedHash.split("$");

  if (
    scheme !== PASSWORD_SCHEME ||
    !iterationsValue ||
    !saltValue ||
    !derivedKeyValue
  ) {
    return false;
  }

  const iterations = Number(iterationsValue);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = decodeBase64(saltValue);
  const expectedKey = decodeBase64(derivedKeyValue);
  const actualKey = await derivePasswordKey(password, salt, iterations);

  if (expectedKey.byteLength !== actualKey.byteLength) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expectedKey), Buffer.from(actualKey));
}
