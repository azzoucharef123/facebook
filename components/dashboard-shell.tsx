"use client";

import { startTransition, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { botSettingsSchema, testConnectionSchema } from "@/lib/validations";
import { formatDateTime } from "@/lib/utils";
type DashboardSettings = {
  pageId: string;
  intervalSeconds: number;
  mode: "all_posts" | "single_post";
  postId: string;
  replyText: string;
  keywords: string;
  processOldComments: boolean;
  sendPrivateMessage: boolean;
  autoLike: boolean;
  isEnabled: boolean;
  hasSavedAccessToken: boolean;
  maskedPageAccessToken: string;
  enabledAt: string | null;
};
type DashboardComment = { id: string; commentId: string; commenterName: string; message: string; repliedAt: string; postId: string; };
type DashboardLog = { id: string; level: "info" | "warn" | "error"; message: string; createdAt: string; metaJson: string | null; };
type PostOption = { id: string; label: string; createdAt: string | null; };
type Props = {
  userEmail: string;
  initialSettings: DashboardSettings;
  processedComments: DashboardComment[];
  recentLogs: DashboardLog[];
  privateMessageFeatureEnabled: boolean;
  workerEnabled: boolean;
  lockIsActive: boolean;
  processedCommentsCount: number;
  commentsPage: number;
  commentsTotalPages: number;
};

type FormState = DashboardSettings & { pageAccessToken: string; };
type ErrorState = Partial<Record<keyof FormState, string>>;
function toFormState(settings: DashboardSettings): FormState {
  return { ...settings, pageAccessToken: "" };
}

function mapFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const fieldErrors = error.flatten().fieldErrors;
  return Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] || ""])) as ErrorState;
}

async function parseResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "تعذر تنفيذ الطلب.");
  }
  return payload;
}
export function DashboardShell({ userEmail, initialSettings, processedComments, recentLogs, privateMessageFeatureEnabled, workerEnabled, lockIsActive, processedCommentsCount, commentsPage, commentsTotalPages }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(toFormState(initialSettings));
  const [errors, setErrors] = useState<ErrorState>({});
  const [busy, setBusy] = useState<"save" | "start" | "stop" | "test" | "posts" | "cycle" | null>(null);
  const [posts, setPosts] = useState<PostOption[]>([]);

  const selectedPost = useMemo(() => posts.find((post) => post.id === form.postId) || null, [posts, form.postId]);

  function setValue<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function applySettings(settings: DashboardSettings) {
    setForm({ ...settings, pageAccessToken: "" });
  }
  function validateSettings() {
    const result = botSettingsSchema.safeParse(form);
    if (!result.success) {
      setErrors(mapFieldErrors(result.error));
      return false;
    }

    if (!form.pageAccessToken && !form.hasSavedAccessToken) {
      setErrors((current) => ({ ...current, pageAccessToken: "رمز الوصول للصفحة مطلوب." }));
      return false;
    }

    setErrors({});
    return true;
  }

  async function saveSettings(nextEnabled: boolean) {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isEnabled: nextEnabled })
    });

    const payload = await parseResponse(response);
    applySettings(payload.settings as DashboardSettings);
    return payload.settings as DashboardSettings;
  }
  async function handleSave() {
    if (!validateSettings()) {
      toast.error("راجِع الحقول المطلوبة ثم حاول مرة أخرى.");
      return;
    }

    setBusy("save");
    try {
      await saveSettings(form.isEnabled);
      toast.success("تم حفظ الإعدادات.");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(null);
    }
  }

  async function handleStart() {
    if (!validateSettings()) {
      toast.error("راجِع الحقول المطلوبة ثم حاول مرة أخرى.");
      return;
    }

    const snapshot = form;
    setForm((current) => ({ ...current, isEnabled: true, enabledAt: new Date().toISOString() }));
    setBusy("start");
    try {
      await saveSettings(true);
      const payload = await parseResponse(await fetch("/api/bot/start", { method: "POST" }));
      applySettings(payload.settings as DashboardSettings);
      toast.success("تم تشغيل البوت.");
      startTransition(() => router.refresh());
    } catch (error) {
      setForm(snapshot);
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(null);
    }
  }

  async function handleStop() {
    const snapshot = form;
    setForm((current) => ({ ...current, isEnabled: false }));
    setBusy("stop");
    try {
      const payload = await parseResponse(await fetch("/api/bot/stop", { method: "POST" }));
      applySettings(payload.settings as DashboardSettings);
      toast.success("تم إيقاف البوت.");
      startTransition(() => router.refresh());
    } catch (error) {
      setForm(snapshot);
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(null);
    }
  }
  async function handleTest() {
    const result = testConnectionSchema.safeParse({ pageId: form.pageId, pageAccessToken: form.pageAccessToken });
    if (!result.success) {
      setErrors(mapFieldErrors(result.error));
      toast.error("أدخل معرف الصفحة أولا.");
      return;
    }

    setBusy("test");
    try {
      const payload = await parseResponse(await fetch("/api/facebook/test-connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId: form.pageId, pageAccessToken: form.pageAccessToken }) }));
      toast.success("تم الاتصال بالصفحة: " + payload.page.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(null);
    }
  }

  async function handleFetchPosts() {
    const result = testConnectionSchema.safeParse({ pageId: form.pageId, pageAccessToken: form.pageAccessToken });
    if (!result.success) {
      setErrors(mapFieldErrors(result.error));
      toast.error("أدخل معرف الصفحة أولا.");
      return;
    }
    setBusy("posts");
    try {
      const payload = await parseResponse(await fetch("/api/facebook/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId: form.pageId, pageAccessToken: form.pageAccessToken }) }));
      setPosts(payload.posts as PostOption[]);
      if (!form.postId && payload.posts[0]) {
        setValue("postId", payload.posts[0].id);
      }
      toast.success("تم جلب أحدث المنشورات.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRunCycleNow() {
    setBusy("cycle");
    try {
      const payload = await parseResponse(await fetch("/api/bot/run-once", { method: "POST" }));
      toast.success(payload.message + (payload.result?.processedCount ? " تمت معالجة " + payload.result.processedCount + " تعليق." : ""));
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(null);
    }
  }
  function goToPage(nextPage: number) {
    startTransition(() => router.push(("/dashboard?page=" + nextPage) as Route));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel backdrop-blur sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-1 text-sm font-semibold text-brand-200">لوحة إدارة بوت تعليقات فيسبوك</span>
            <h1 className="text-3xl font-black text-white sm:text-4xl">جاهز للإنتاج على Railway بخدمة Worker منفصلة</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">المستخدم الحالي: {userEmail}. البنية الأنظف للإنتاج هي Web Service منفصلة عن Worker Service، وهذا هو المسار الموصى به والمطبق هنا.</p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3"><div className="text-slate-400">حالة البوت</div><div className="mt-1 font-bold text-white">{form.isEnabled ? "قيد التشغيل" : "متوقف"}</div></div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3"><div className="text-slate-400">وضع العامل</div><div className="mt-1 font-bold text-white">{workerEnabled ? "خدمة مستقلة مفعلة" : "معطل بالبيئة"}</div></div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3"><div className="text-slate-400">قفل الدورة</div><div className="mt-1 font-bold text-white">{lockIsActive ? "هناك دورة تعمل الآن" : "لا يوجد قفل نشط"}</div></div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3"><div className="text-slate-400">إجمالي التعليقات المعالجة</div><div className="mt-1 font-bold text-white">{processedCommentsCount}</div></div>
          </div>
        </div>
      </section>
      <section className="grid gap-8 lg:grid-cols-[1.5fr,0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel backdrop-blur sm:p-8">
          <h2 className="text-2xl font-bold text-white">إعدادات التشغيل</h2>
          <p className="mt-2 text-sm text-slate-400">يتم إخفاء رمز الوصول المحفوظ. اترك الحقل فارغا للاحتفاظ به.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-200"><span>معرف الصفحة</span><input value={form.pageId} onChange={(event) => setValue("pageId", event.target.value)} dir="ltr" className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-brand-400" />{errors.pageId ? <span className="text-xs text-rose-300">{errors.pageId}</span> : null}</label>
            <label className="space-y-2 text-sm font-semibold text-slate-200"><span>الفاصل الزمني بالثواني</span><input type="number" min={5} max={3600} value={form.intervalSeconds} onChange={(event) => setValue("intervalSeconds", Number(event.target.value))} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-brand-400" />{errors.intervalSeconds ? <span className="text-xs text-rose-300">{errors.intervalSeconds}</span> : null}</label>
            <label className="space-y-2 text-sm font-semibold text-slate-200"><span>وضع التشغيل</span><select value={form.mode} onChange={(event) => setValue("mode", event.target.value as "all_posts" | "single_post")} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-brand-400"><option value="all_posts">كل المنشورات</option><option value="single_post">منشور واحد</option></select></label>
            <label className="space-y-2 text-sm font-semibold text-slate-200 md:col-span-2"><span>رمز وصول الصفحة</span><input type="password" value={form.pageAccessToken} onChange={(event) => setValue("pageAccessToken", event.target.value)} dir="ltr" placeholder={form.hasSavedAccessToken ? form.maskedPageAccessToken : "أدخل رمز الوصول"} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-brand-400" />{form.hasSavedAccessToken ? <span className="text-xs text-slate-400">الرمز المحفوظ: {form.maskedPageAccessToken}</span> : null}{errors.pageAccessToken ? <span className="block text-xs text-rose-300">{errors.pageAccessToken}</span> : null}</label>
            <label className="space-y-2 text-sm font-semibold text-slate-200 md:col-span-2"><span>نص الرد الافتراضي</span><textarea value={form.replyText} onChange={(event) => setValue("replyText", event.target.value)} rows={5} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-brand-400" />{errors.replyText ? <span className="text-xs text-rose-300">{errors.replyText}</span> : null}</label>
            <label className="space-y-2 text-sm font-semibold text-slate-200 md:col-span-2"><span>الكلمات المفتاحية المفصولة بفواصل</span><textarea value={form.keywords} onChange={(event) => setValue("keywords", event.target.value)} rows={3} placeholder="مثال: سعر, طلب, تفاصيل" className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-brand-400" /></label>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"><span>معالجة التعليقات القديمة</span><input type="checkbox" checked={form.processOldComments} onChange={(event) => setValue("processOldComments", event.target.checked)} /></label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"><span>إعجاب تلقائي بالتعليق</span><input type="checkbox" checked={form.autoLike} onChange={(event) => setValue("autoLike", event.target.checked)} /></label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"><span>تفعيل البوت</span><input type="checkbox" checked={form.isEnabled} onChange={(event) => setValue("isEnabled", event.target.checked)} /></label>
            <label className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"><span>محاولة رسالة خاصة</span><input type="checkbox" checked={form.sendPrivateMessage} onChange={(event) => setValue("sendPrivateMessage", event.target.checked)} /></label>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-100">الرسائل الخاصة تحتاج صلاحيات Facebook إضافية وقد تفشل حتى عند التفعيل. {privateMessageFeatureEnabled ? "علم الميزة مفعّل من الخادم." : "علم الميزة غير مفعّل من الخادم."}</div>

          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-bold text-white">اختيار منشور محدد</h3><button type="button" onClick={handleFetchPosts} disabled={busy !== null} className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-100 disabled:opacity-60">{busy === "posts" ? "جار الجلب..." : "جلب أحدث المنشورات"}</button></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-200"><span>المنشور المحدد</span><select value={form.postId} onChange={(event) => setValue("postId", event.target.value)} disabled={form.mode !== "single_post"} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-brand-400 disabled:opacity-50"><option value="">اختر منشورا بعد الجلب</option>{posts.map((post) => <option key={post.id} value={post.id}>{post.label}</option>)}</select>{errors.postId ? <span className="text-xs text-rose-300">{errors.postId}</span> : null}</label>
              <div className="space-y-2 text-sm text-slate-300"><div className="font-semibold text-slate-200">المعرف المختار</div><div dir="ltr" className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">{selectedPost?.id || form.postId || "لا يوجد"}</div><div className="text-xs text-slate-400">{selectedPost?.createdAt ? "تاريخ المنشور: " + formatDateTime(selectedPost.createdAt) : ""}</div></div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={handleSave} disabled={busy !== null} className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy === "save" ? "جار الحفظ..." : "حفظ الإعدادات"}</button>
            <button type="button" onClick={handleStart} disabled={busy !== null} className="rounded-2xl border border-brand-400/50 bg-brand-500/10 px-5 py-3 text-sm font-bold text-brand-100 disabled:opacity-60">{busy === "start" ? "جار التشغيل..." : "تشغيل البوت"}</button>
            <button type="button" onClick={handleStop} disabled={busy !== null} className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-100 disabled:opacity-60">{busy === "stop" ? "جار الإيقاف..." : "إيقاف البوت"}</button>
            <button type="button" onClick={handleTest} disabled={busy !== null} className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-5 py-3 text-sm font-bold text-sky-100 disabled:opacity-60">{busy === "test" ? "جار الاختبار..." : "اختبار اتصال فيسبوك"}</button>
            <button type="button" onClick={handleRunCycleNow} disabled={busy !== null} className="rounded-2xl border border-violet-500/40 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-100 disabled:opacity-60">{busy === "cycle" ? "جار التنفيذ..." : "تشغيل دورة الآن"}</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel backdrop-blur"><h2 className="text-xl font-bold text-white">ملخص الحالة</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3">آخر تشغيل: {form.enabledAt ? formatDateTime(form.enabledAt) : "لم يتم التشغيل بعد"}</div><div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3">الصفحة الحالية: <span dir="ltr">{form.pageId || "-"}</span></div><div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3">عدد الصفحات في التعليقات: {commentsTotalPages}</div></div></div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel backdrop-blur"><h2 className="text-xl font-bold text-white">السجلات الحديثة</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200"><thead><tr className="text-right text-slate-400"><th className="px-3 py-3">المستوى</th><th className="px-3 py-3">الرسالة</th><th className="px-3 py-3">الوقت</th></tr></thead><tbody className="divide-y divide-slate-800">{recentLogs.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">لا توجد سجلات بعد.</td></tr> : recentLogs.map((log) => <tr key={log.id}><td className="px-3 py-3">{log.level}</td><td className="px-3 py-3">{log.message}</td><td className="px-3 py-3">{formatDateTime(log.createdAt)}</td></tr>)}</tbody></table></div></div>
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel backdrop-blur sm:p-8">
        <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-bold text-white">التعليقات المعالجة</h2><div className="text-sm text-slate-400">الصفحة {commentsPage} من {commentsTotalPages}</div></div>
        <div className="mt-5 overflow-x-auto"><table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200"><thead><tr className="text-right text-slate-400"><th className="px-3 py-3">معرف التعليق</th><th className="px-3 py-3">اسم المعلّق</th><th className="px-3 py-3">الرسالة</th><th className="px-3 py-3">تم الرد في</th><th className="px-3 py-3">معرف المنشور</th></tr></thead><tbody className="divide-y divide-slate-800">{processedComments.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">لا توجد تعليقات معالجة حتى الآن.</td></tr> : processedComments.map((comment) => <tr key={comment.id} className="align-top"><td className="px-3 py-4" dir="ltr">{comment.commentId}</td><td className="px-3 py-4">{comment.commenterName}</td><td className="px-3 py-4">{comment.message}</td><td className="px-3 py-4">{formatDateTime(comment.repliedAt)}</td><td className="px-3 py-4" dir="ltr">{comment.postId}</td></tr>)}</tbody></table></div>
        <div className="mt-5 flex items-center justify-between"><button type="button" onClick={() => goToPage(Math.max(1, commentsPage - 1))} disabled={commentsPage <= 1} className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-bold text-slate-100 disabled:opacity-50">الصفحة السابقة</button><button type="button" onClick={() => goToPage(Math.min(commentsTotalPages, commentsPage + 1))} disabled={commentsPage >= commentsTotalPages} className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-bold text-slate-100 disabled:opacity-50">الصفحة التالية</button></div>
      </section>
    </div>
  );
}
