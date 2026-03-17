import { jwtVerify, SignJWT } from "jose";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export type SessionPayload = {
  userId: string;
  email: string;
};

function getJwtSecret() {
  const value = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!value) {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be configured.");
  }

  return new TextEncoder().encode(value);
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}
export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());

  if (typeof payload.userId !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid session payload.");
  }

  return {
    userId: payload.userId,
    email: payload.email
  } satisfies SessionPayload;
}

export function getSessionCookieConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const secureOverride = process.env.SESSION_COOKIE_SECURE;
  const secure =
    secureOverride === undefined ? isProduction : secureOverride === "true";

  return {
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure
  };
}
