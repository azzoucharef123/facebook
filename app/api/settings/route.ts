import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth";
import { logBotEvent } from "@/lib/logging";
import { getOrCreateBotSettings, saveBotSettings, toPublicSettings } from "@/lib/settings";
import { botSettingsSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const settings = await getOrCreateBotSettings();
  return NextResponse.json({
    success: true,
    settings: toPublicSettings(settings)
  });
}

export async function PUT(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = botSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Validation failed."
        },
        { status: 400 }
      );
    }

    const settings = await saveBotSettings(parsed.data);

    await logBotEvent("info", "Bot settings updated from dashboard.", {
      userId: user.id,
      mode: settings.mode,
      isEnabled: settings.isEnabled
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
