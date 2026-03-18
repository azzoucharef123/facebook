import { NextResponse } from "next/server";
import { assertSetupSecret, upsertAdminUser } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    assertSetupSecret(request);
    const user = await upsertAdminUser();

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    const status = /Unauthorized/.test(message) ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        message
      },
      { status }
    );
  }
}
