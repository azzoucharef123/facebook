import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/70 shadow-panel backdrop-blur lg:grid-cols-[1.1fr,0.9fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.28),transparent_30%),linear-gradient(180deg,#14532d_0%,#052e16_100%)] p-10 lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.06)_100%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-semibold text-emerald-100">Facebook Page Bot</span>
              <h1 className="mt-6 text-5xl font-black leading-tight text-white">إدارة عربية حديثة لبوت تعليقات صفحتك</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-50/90">لوحة واحدة لتشغيل الردود، متابعة السجل، والتحكم بالعامل الخلفي على Railway بشكل واضح وآمن.</p>
            </div>
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 text-sm leading-7 text-emerald-50/90">
              احرص على استخدام Page Access Token صالح وصلاحيات Facebook المطلوبة. التوكن لا يتم عرضه مجددا بعد حفظه داخل النظام.
            </div>
          </div>
        </section>
        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <h2 className="text-3xl font-black text-white">تسجيل الدخول</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">استخدم حساب المشرف الذي تم إنشاؤه من خلال متغيرات البيئة وسكربت الـ seed.</p>
            <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/50 p-6">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
