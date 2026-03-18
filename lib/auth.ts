import "server-only";

import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getSessionCookieConfig,
  signSessionToken,
  verifySessionToken
} from "@/lib/session";
import { normalizeEmail } from "@/lib/utils";

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  return user;
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
  const token = cookies().get(getSessionCookieConfig().name)?.value;
  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);
    return prisma.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}
export async function getApiUser(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieConfig().name)?.value;
  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);
    return prisma.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        email: true
      }
    });
  } catch {
    return null;
  }
}
