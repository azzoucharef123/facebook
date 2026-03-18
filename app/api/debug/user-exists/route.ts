import { NextResponse } from "next/server";
import { assertSetupSecret, findUserByEmail } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    assertSetupSecret(request);

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required."
        },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    return NextResponse.json({
      success: true,
      exists: Boolean(user),
      user: user ? { id: user.id, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt } : null
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
