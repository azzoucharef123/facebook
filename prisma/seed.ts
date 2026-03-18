import "dotenv/config";

import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function main() {
  const rawEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!rawEmail || !rawPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding.");
  }

  const email = normalizeEmail(rawEmail);
  const password = await bcrypt.hash(rawPassword, 12);

  await prisma.user.upsert({
    where: { email },
    update: { password },
    create: {
      email,
      password
    }
  });

  console.info("Admin user seeded:", email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
