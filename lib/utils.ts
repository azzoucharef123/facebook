export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "غير متوفر";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseKeywords(input: string) {
  return input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function hasKeywordMatch(message: string, keywords: string[]) {
  if (keywords.length === 0) {
    return true;
  }

  const lowered = message.toLowerCase();
  return keywords.some((keyword) => lowered.includes(keyword));
}

export function sanitizeMeta<T>(value: T): T {
  const serialized = JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === "string" && /token/i.test(currentValue)) {
      return "[redacted]";
    }

    return currentValue;
  });

  return JSON.parse(serialized) as T;
}
