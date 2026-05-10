import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const PASSWORD_SCHEME = "pbkdf2-sha256";
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_KEY_LENGTH_BYTES = 32;

function encodeBase64(value: Uint8Array): string {
  return Buffer.from(value).toString("base64");
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function derivePasswordKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const derivedKey = pbkdf2Sync(
    password,
    Buffer.from(salt),
    iterations,
    PASSWORD_KEY_LENGTH_BYTES,
    "sha256",
  );

  return new Uint8Array(derivedKey);
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
