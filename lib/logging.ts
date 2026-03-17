import "server-only";

import { BotLogLevel, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type LogMeta = Record<string, unknown> | undefined;

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (/token|secret|password/i.test(key)) {
          return [key, "[redacted]"];
        }

        return [key, redactValue(nestedValue)];
      })
    );
  }

  return value;
}
export async function logBotEvent(
  level: BotLogLevel,
  message: string,
  meta?: LogMeta
) {
  const sanitizedMeta = meta ? (redactValue(meta) as Record<string, unknown>) : undefined;
  const consoleMessage = `[bot:${level}] ${message}`;

  if (level === "error") {
    console.error(consoleMessage, sanitizedMeta ?? "");
  } else if (level === "warn") {
    console.warn(consoleMessage, sanitizedMeta ?? "");
  } else {
    console.info(consoleMessage, sanitizedMeta ?? "");
  }

  await prisma.botLog.create({
    data: {
      level,
      message,
      metaJson: sanitizedMeta as Prisma.InputJsonValue | undefined
    }
  });
}
