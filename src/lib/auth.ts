import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role, UserStatus } from "@prisma/client";

const COOKIE_NAME = "orderflow_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  distributorId: string | null;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    distributorId: user.distributorId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function destroySession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      id: payload.id as string,
      fullName: payload.fullName as string,
      email: payload.email as string,
      role: payload.role as Role,
      status: payload.status as UserStatus,
      distributorId: (payload.distributorId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Re-checks the user against the database (not just the JWT claims), so a
 * deactivated user is rejected immediately even with a still-valid cookie.
 * Use this in server actions and pages that need a guaranteed-fresh
 * account state, per spec 01: "Inactive users cannot authenticate."
 */
export async function requireFreshUser(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new Error("Unauthorized: no session");
  }
  const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!dbUser || dbUser.status !== "ACTIVE") {
    destroySession();
    throw new Error("Unauthorized: account inactive or missing");
  }
  return {
    id: dbUser.id,
    fullName: dbUser.fullName,
    email: dbUser.email,
    role: dbUser.role,
    status: dbUser.status,
    distributorId: dbUser.distributorId,
  };
}

export { COOKIE_NAME };
