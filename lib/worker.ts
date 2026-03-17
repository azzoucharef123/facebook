import "server-only";

import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "./prisma";
import { MIN_INTERVAL_SECONDS } from "./constants";
import { getPagePosts, getPostComments, likeComment, replyToComment, sendPrivateReply, type FacebookComment } from "./facebook";
import { logBotEvent } from "./logging";
import { getOrCreateBotSettings } from "./settings";
import { hasKeywordMatch, sleep } from "./utils";
import { acquireWorkerLock, getWorkerLock, releaseWorkerLock } from "./worker-lock";

type CycleTrigger = "worker" | "manual";

type CycleResult = {
  ok: boolean;
  trigger: CycleTrigger;
  processedCount: number;
  skippedReason?: string;
};

function getCycleDelay(intervalSeconds: number) {
  return Math.max(intervalSeconds, MIN_INTERVAL_SECONDS) * 1000;
}

function shouldSkipOldComment(comment: FacebookComment, enabledAt: Date | null) {
  if (!enabledAt || !comment.created_time) {
    return false;
  }

  return new Date(comment.created_time) < enabledAt;
}
async function processComment(settings: Awaited<ReturnType<typeof getOrCreateBotSettings>>, comment: FacebookComment, postId: string) {
  const commentId = comment.id;
  const message = comment.message?.trim() || "";
  const commenterName = comment.from?.name || "Facebook User";
  const privateReplyEnabled = process.env.ENABLE_PRIVATE_MESSAGE_FEATURE === "true";

  if (!message || comment.parent?.id || comment.from?.id === settings.pageId) {
    return false;
  }

  if (!settings.processOldComments && shouldSkipOldComment(comment, settings.enabledAt ?? null)) {
    return false;
  }

  if (!hasKeywordMatch(message, settings.keywords)) {
    return false;
  }

  const existing = await prisma.processedComment.findUnique({ where: { commentId } });
  if (existing) {
    return false;
  }

  try {
    if (!settings.pageAccessToken) {
      throw new Error("Page access token is missing.");
    }

    try {
      await likeComment(commentId, settings.pageAccessToken);
    } catch (error) {
      await logBotEvent("warn", "Matched comment could not be liked, continuing with reply.", {
        event: "comment_like_failed",
        commentId,
        postId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    await replyToComment(commentId, settings.pageAccessToken, settings.replyText);
    if (settings.sendPrivateMessage) {
      if (!privateReplyEnabled) {
        await logBotEvent("warn", "Private replies requested but feature flag is disabled.", { event: "private_reply_skipped", commentId });
      } else {
        try {
          await sendPrivateReply(commentId, settings.pageAccessToken, settings.replyText);
        } catch (error) {
          await logBotEvent("warn", "Private reply attempt failed.", { event: "private_reply_failed", commentId, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }
    }

    await prisma.processedComment.create({
      data: { commentId, postId, commenterName, message, repliedAt: new Date() }
    });

    await logBotEvent("info", "Processed Facebook comment.", { event: "comment_processed", commentId, postId, commenterName });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }

    await logBotEvent("error", "Failed to process Facebook comment.", { event: "comment_process_failed", commentId, postId, error: error instanceof Error ? error.message : "Unknown error" });
    return false;
  }
}
export async function runBotCycle(trigger: CycleTrigger, force = false): Promise<CycleResult> {
  const ownerId = trigger + "-" + randomUUID();
  const acquired = await acquireWorkerLock(ownerId);

  if (!acquired) {
    return { ok: false, trigger, processedCount: 0, skippedReason: "locked" };
  }

  try {
    const settings = await getOrCreateBotSettings();

    if (!force && !settings.isEnabled) {
      return { ok: true, trigger, processedCount: 0, skippedReason: "disabled" };
    }

    if (!settings.pageId || !settings.pageAccessToken || !settings.replyText) {
      await logBotEvent("warn", "Bot cycle skipped because required settings are missing.", { event: "cycle_skipped_missing_settings", trigger, hasPageId: Boolean(settings.pageId), hasPageAccessToken: Boolean(settings.pageAccessToken), hasReplyText: Boolean(settings.replyText) });
      return { ok: false, trigger, processedCount: 0, skippedReason: "missing_settings" };
    }

    if (settings.mode === "single_post" && !settings.postId) {
      await logBotEvent("warn", "Single-post mode requires a postId.", { event: "cycle_skipped_missing_post_id", trigger });
      return { ok: false, trigger, processedCount: 0, skippedReason: "missing_post_id" };
    }

    const posts = settings.mode === "single_post" ? [{ id: settings.postId as string }] : await getPagePosts(settings.pageId, settings.pageAccessToken);
    let processedCount = 0;
    for (const post of posts) {
      try {
        const comments = await getPostComments(post.id, settings.pageAccessToken);

        for (const comment of comments) {
          const processed = await processComment(settings, comment, post.id);
          if (processed) {
            processedCount += 1;
          }
        }
      } catch (error) {
        await logBotEvent("error", "Failed while processing a Facebook post.", { event: "post_process_failed", trigger, postId: post.id, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    await logBotEvent("info", "Worker cycle finished.", { event: "cycle_finished", trigger, processedCount, force });
    return { ok: true, trigger, processedCount };
  } finally {
    await releaseWorkerLock(ownerId);
  }
}

export async function getBotRuntimeStatus() {
  const [settings, lock, processedCommentsCount, latestLog] = await Promise.all([
    getOrCreateBotSettings(),
    getWorkerLock(),
    prisma.processedComment.count(),
    prisma.botLog.findFirst({ orderBy: { createdAt: "desc" } })
  ]);
  return {
    settings,
    lock,
    processedCommentsCount,
    latestLog,
    workerMode: "separate_service_recommended",
    workerEnabledByEnv: process.env.OPTIONAL_WORKER_ENABLED !== "false"
  };
}

export async function startWorkerLoop() {
  if (process.env.OPTIONAL_WORKER_ENABLED === "false") {
    console.info("Worker disabled via OPTIONAL_WORKER_ENABLED=false.");
    return;
  }

  await logBotEvent("info", "Worker loop started.", { event: "worker_started" });

  while (true) {
    const settings = await getOrCreateBotSettings();

    try {
      const result = await runBotCycle("worker");
      if (result.skippedReason === "locked") {
        await logBotEvent("info", "Worker cycle skipped because another cycle is running.", { event: "cycle_locked" });
      }
    } catch (error) {
      await logBotEvent("error", "Worker cycle crashed.", { event: "cycle_crashed", error: error instanceof Error ? error.message : "Unknown error" });
    }

    await sleep(getCycleDelay(settings.intervalSeconds));
  }
}

