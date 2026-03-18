import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  getSessionCookieConfig,
  signSessionToken
} from "@/lib/session";

const DEV_USER = {
  id: "dev-user",
  email: "dev@local"
};

export async function authenticateUser(email: string, password: string) {
  void email;
  void password;
  return DEV_USER;
}

export async function createSession(user: { id: string; email: string }) {
  const token = await signSessionToken({
    userId: user.id,
    email: user.email
  });
  const config = getSessionCookieConfig();

  cookies().set(config.name, token, config);
}

export function clearSession() {
  const config = getSessionCookieConfig();

  cookies().set(config.name, "", {
    ...config,
    maxAge: 0,
    expires: new Date(0)
  });
}

export async function getCurrentUser() {
  return DEV_USER;
}

export async function requireUser() {
  return DEV_USER;
}

export async function getApiUser(request: NextRequest) {
  void request;
  return DEV_USER;
}
