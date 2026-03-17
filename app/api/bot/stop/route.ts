import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getApiUser } from "@/lib/auth";
import { DEFAULT_SETTINGS_ID } from "@/lib/constants";
import { logBotEvent } from "@/lib/logging";
import { toPublicSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const settings = await prisma.botSettings.upsert({
      where: {
        id: DEFAULT_SETTINGS_ID
      },
      update: {
        isEnabled: false
      },
      create: {
        id: DEFAULT_SETTINGS_ID,
        isEnabled: false
      }
    });

    await logBotEvent("info", "Bot stopped from dashboard.", {
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      settings: toPublicSettings(settings)
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unexpected error."
      },
      { status: 500 }
    );
  }
}
