import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth";
import { runBotCycle } from "@/lib/worker";

function getCycleMessage(reason?: string) {
  if (reason === "locked") return "هناك دورة أخرى قيد التشغيل حاليا.";
  if (reason === "missing_settings") return "أكمل إعدادات الصفحة والرد قبل تشغيل دورة فورية.";
  if (reason === "missing_post_id") return "اختر منشورا واحدا قبل التشغيل الفوري.";
  return "تم تنفيذ دورة فورية.";
}

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runBotCycle("manual", true);
    const status = result.ok || result.skippedReason === "locked" ? 200 : 400;

    return NextResponse.json({ success: result.ok, result, message: getCycleMessage(result.skippedReason) }, { status });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Unexpected error." }, { status: 500 });
  }
}
