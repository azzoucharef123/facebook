import bcrypt from "bcrypt";
import prisma from "./prisma";
import { normalizeEmail } from "./utils";

function getRequiredEnv(name: "ADMIN_EMAIL" | "ADMIN_PASSWORD") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
}

export function assertSetupSecret(request: Request) {
  const expected = process.env.SETUP_SECRET?.trim();
  const provided = (request.headers.get("x-setup-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "").trim();

  if (!expected) {
    throw new Error("SETUP_SECRET is not configured.");
  }

  if (!provided || provided !== expected) {
    throw new Error("Unauthorized setup request.");
  }
}

export async function upsertAdminUser() {
  const email = normalizeEmail(getRequiredEnv("ADMIN_EMAIL"));
  const password = getRequiredEnv("ADMIN_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: normalizeEmail(email)
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

