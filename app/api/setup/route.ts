import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export async function GET() {
  const email = "zazouhacerf3@gmail.com".trim().toLowerCase();
  const passwordHash = await bcrypt.hash("1111azou@", 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash
    }
  });

  return NextResponse.json({
    success: true,
    email
  });
}
