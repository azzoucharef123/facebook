import "server-only";

import type { BotSettings } from "@prisma/client";
import prisma from "@/lib/prisma";
import { DEFAULT_INTERVAL_SECONDS, DEFAULT_SETTINGS_ID } from "@/lib/constants";
import { parseKeywords } from "@/lib/utils";

export async function getOrCreateBotSettings() {
  return prisma.botSettings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: {},
    create: { id: DEFAULT_SETTINGS_ID, intervalSeconds: DEFAULT_INTERVAL_SECONDS }
  });
}

function getMaskedToken(value: string | null) {
  if (!value) {
    return "";
  }

  return "•••••••• محفوظ";
}
export function toPublicSettings(settings: BotSettings) {
  return {
    id: settings.id,
    pageId: settings.pageId,
    intervalSeconds: settings.intervalSeconds,
    mode: settings.mode,
    postId: settings.postId ?? "",
    replyText: settings.replyText,
    keywords: settings.keywords.join(", "),
    processOldComments: settings.processOldComments,
    sendPrivateMessage: settings.sendPrivateMessage,
    autoLike: settings.autoLike,
    isEnabled: settings.isEnabled,
    hasSavedAccessToken: Boolean(settings.pageAccessToken),
    maskedPageAccessToken: getMaskedToken(settings.pageAccessToken),
    enabledAt: settings.enabledAt?.toISOString() ?? null,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString()
  };
}
export async function saveBotSettings(input: {
  pageId: string;
  pageAccessToken?: string;
  intervalSeconds: number;
  mode: "all_posts" | "single_post";
  postId?: string;
  replyText: string;
  keywords: string;
  processOldComments: boolean;
  sendPrivateMessage: boolean;
  autoLike: boolean;
  isEnabled: boolean;
}) {
  const existing = await getOrCreateBotSettings();
  const trimmedToken = input.pageAccessToken?.trim();
  const pageAccessToken = trimmedToken || existing.pageAccessToken || null;

  if (!pageAccessToken) {
    throw new Error("Page access token is required before saving settings.");
  }

  const data = {
    pageId: input.pageId.trim(),
    pageAccessToken,
    intervalSeconds: input.intervalSeconds,
    mode: input.mode,
    postId: input.mode === "single_post" ? input.postId?.trim() || "" : null,
    replyText: input.replyText.trim(),
    keywords: parseKeywords(input.keywords),
    processOldComments: input.processOldComments,
    sendPrivateMessage: input.sendPrivateMessage,
    autoLike: input.autoLike,
    isEnabled: input.isEnabled
  };

  return prisma.botSettings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: data,
    create: { id: DEFAULT_SETTINGS_ID, ...data }
  });
}
