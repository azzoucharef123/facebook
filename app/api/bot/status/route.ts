import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth";
import { toPublicSettings } from "@/lib/settings";
import { getBotRuntimeStatus } from "@/lib/worker";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const status = await getBotRuntimeStatus();

  return NextResponse.json({
    success: true,
    recommendation: "استخدم خدمة Worker مستقلة على Railway. هذا هو الخيار المطبق والمفضل للإنتاج.",
    workerMode: status.workerMode,
    workerEnabledByEnv: status.workerEnabledByEnv,
    lock: {
      ownerId: status.lock.ownerId,
      lockedAt: status.lock.lockedAt?.toISOString() ?? null,
      lockedUntil: status.lock.lockedUntil?.toISOString() ?? null,
      isLocked: Boolean(status.lock.lockedUntil && status.lock.lockedUntil > new Date())
    },
    processedCommentsCount: status.processedCommentsCount,
    latestLog: status.latestLog
      ? {
          level: status.latestLog.level,
          message: status.latestLog.message,
          createdAt: status.latestLog.createdAt.toISOString()
        }
      : null,
    settings: toPublicSettings(status.settings)
  });
}
