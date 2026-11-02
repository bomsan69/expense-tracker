import { hash, verify } from "@node-rs/argon2";

// Argon2id is this library's default algorithm; no options needed.
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}
