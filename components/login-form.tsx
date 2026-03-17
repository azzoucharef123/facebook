"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "تعذر تسجيل الدخول.");
      }

      toast.success("تم تسجيل الدخول بنجاح.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-slate-200">
          البريد الإلكتروني
        </label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30" placeholder="admin@example.com" />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-slate-200">
          كلمة المرور
        </label>
        <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30" placeholder="********" />
      </div>
      <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-base font-bold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70">
        {isSubmitting ? "جار تسجيل الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
