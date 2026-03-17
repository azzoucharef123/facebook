import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth";
import { testPageConnection } from "@/lib/facebook";
import { getOrCreateBotSettings } from "@/lib/settings";
import { testConnectionSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = testConnectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Validation failed."
        },
        { status: 400 }
      );
    }

    const settings = await getOrCreateBotSettings();
    const accessToken = parsed.data.pageAccessToken || settings.pageAccessToken;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "أدخل Page Access Token أو احفظه أولا."
        },
        { status: 400 }
      );
    }

    const page = await testPageConnection(parsed.data.pageId, accessToken);

    return NextResponse.json({
      success: true,
      page
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
