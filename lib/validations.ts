import { z } from "zod";
import { MAX_INTERVAL_SECONDS, MIN_INTERVAL_SECONDS } from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().trim().email("أدخل بريدا إلكترونيا صالحا."),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.")
});

export const botSettingsSchema = z
  .object({
    pageId: z.string().trim().min(1, "معرف الصفحة مطلوب."),
    pageAccessToken: z.string().trim().optional().default(""),
    intervalSeconds: z.coerce.number().int("يجب أن تكون القيمة عددا صحيحا.").min(MIN_INTERVAL_SECONDS, "أقل قيمة مسموحة هي " + MIN_INTERVAL_SECONDS + ".").max(MAX_INTERVAL_SECONDS, "أقصى قيمة مسموحة هي " + MAX_INTERVAL_SECONDS + "."),
    mode: z.enum(["all_posts", "single_post"]),
    postId: z.string().trim().optional().default(""),
    replyText: z.string().trim().min(1, "نص الرد الافتراضي مطلوب."),
    keywords: z.string().trim().optional().default(""),
    processOldComments: z.coerce.boolean().default(false),
    sendPrivateMessage: z.coerce.boolean().default(false),
    autoLike: z.coerce.boolean().default(false),
    isEnabled: z.coerce.boolean().default(false)
  })
  .superRefine((data, context) => {
    if (data.mode === "single_post" && !data.postId.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "معرف المنشور مطلوب عند اختيار منشور واحد.",
        path: ["postId"]
      });
    }
  });

export const testConnectionSchema = z.object({
  pageId: z.string().trim().min(1, "معرف الصفحة مطلوب."),
  pageAccessToken: z.string().trim().optional().default("")
});
