import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getApiUser } from "@/lib/auth";
import { DEFAULT_SETTINGS_ID } from "@/lib/constants";
import { logBotEvent } from "@/lib/logging";
import { getOrCreateBotSettings, toPublicSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const currentSettings = await getOrCreateBotSettings();
    if (!currentSettings.pageId || !currentSettings.pageAccessToken || !currentSettings.replyText) {
      return NextResponse.json(
        {
          success: false,
          message: "احفظ إعدادات الصفحة والرد ونص الوصول قبل تشغيل البوت."
        },
        { status: 400 }
      );
    }

    const settings = await prisma.botSettings.upsert({
      where: {
        id: DEFAULT_SETTINGS_ID
      },
      update: {
        isEnabled: true,
        enabledAt: new Date()
      },
      create: {
        id: DEFAULT_SETTINGS_ID,
        isEnabled: true,
        enabledAt: new Date()
      }
    });

    await logBotEvent("info", "Bot started from dashboard.", {
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
