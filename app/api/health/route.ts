import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, service: "web", timestamp: new Date().toISOString(), database: "not_configured", workerArchitecture: "separate_worker_service_recommended" }, { status: 503 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ ok: true, service: "web", timestamp: new Date().toISOString(), database: "up", workerArchitecture: "separate_worker_service_recommended" });
  } catch (error) {
    return NextResponse.json({ ok: false, service: "web", timestamp: new Date().toISOString(), database: "down", error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
