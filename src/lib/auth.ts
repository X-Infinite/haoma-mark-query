import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  createUser,
  findUserByEmail,
  findUserById,
  type UserRow,
} from "./db";

const COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function secretKey() {
  const secret = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return findUserById(userId) ?? null;
}

export async function registerUser(
  email: string,
  password: string,
): Promise<{ user: UserRow } | { error: string }> {
  if (!email.includes("@") || password.length < 6) {
    return { error: "请输入有效邮箱，密码至少 6 位" };
  }
  if (findUserByEmail(email)) {
    return { error: "该邮箱已注册" };
  }
  const hash = await hashPassword(password);
  const user = createUser(email, hash);
  return { user };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: UserRow } | { error: string }> {
  const user = findUserByEmail(email);
  if (!user) return { error: "邮箱或密码错误" };
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { error: "邮箱或密码错误" };
  return { user };
}

export function sanitizeUser(user: UserRow) {
  return { id: user.id, email: user.email, created_at: user.created_at };
}
