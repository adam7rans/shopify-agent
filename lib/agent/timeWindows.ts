export type TimeGrain = "day" | "week" | "month";
export type RelativeTimeUnit = "day" | "week" | "month";

export interface ResolvedTimeWindow {
  startDate: string;
  endDate: string;
  label: string;
  grain: TimeGrain;
  requestedText?: string;
  dayCount: number;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function startOfUtcWeek(date: Date) {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() + offset);
  return start;
}

function endOfUtcWeek(date: Date) {
  const end = startOfUtcWeek(date);
  end.setUTCDate(end.getUTCDate() + 6);
  return endOfUtcDay(end);
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function normalizePromptText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMonthDayYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateRangeLabel(start: Date, end: Date, referenceDate: Date) {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameYearAsReference = sameYear && end.getUTCFullYear() === referenceDate.getUTCFullYear();

  if (sameYearAsReference) {
    return `${formatMonthDay(start)} to ${formatMonthDay(end)}`;
  }

  if (sameYear) {
    return `${formatMonthDay(start)} to ${formatMonthDay(end)}, ${end.getUTCFullYear()}`;
  }

  return `${formatMonthDayYear(start)} to ${formatMonthDayYear(end)}`;
}

function formatMonthLabel(date: Date, referenceDate: Date) {
  const sameYearAsReference = date.getUTCFullYear() === referenceDate.getUTCFullYear();

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    ...(sameYearAsReference ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}

function inferGrain(dayCount: number): TimeGrain {
  if (dayCount <= 45) return "day";
  if (dayCount <= 120) return "week";
  return "month";
}

function buildResolvedWindow(
  start: Date,
  end: Date,
  referenceDate: Date,
  grain?: TimeGrain,
  requestedText?: string,
): ResolvedTimeWindow {
  const dayCount = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: formatDateRangeLabel(start, end, referenceDate),
    grain: grain ?? inferGrain(dayCount),
    requestedText,
    dayCount,
  };
}

function resolveMonthCountWindow(monthCount: number, referenceDate: Date, requestedText?: string) {
  if (monthCount <= 1) {
    const end = endOfUtcDay(referenceDate);
    const start = addUtcDays(end, -29);
    return buildResolvedWindow(startOfUtcDay(start), end, referenceDate, "day", requestedText);
  }

  const end = endOfUtcDay(referenceDate);
  const startMonth = addUtcMonths(startOfUtcMonth(referenceDate), -(monthCount - 1));
  return buildResolvedWindow(startMonth, end, referenceDate, inferGrain(monthCount * 30), requestedText);
}

export function resolveTimeWindowFromPrompt(
  promptText: string,
  referenceDate: Date,
): ResolvedTimeWindow {
  const normalized = normalizePromptText(promptText);

  if (normalized.includes("last month")) {
    const start = addUtcMonths(startOfUtcMonth(referenceDate), -1);
    const end = endOfUtcMonth(start);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      label: formatMonthLabel(start, referenceDate),
      grain: "day",
      requestedText: "last month",
      dayCount: Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
      ),
    };
  }

  if (normalized.includes("this week")) {
    return buildResolvedWindow(
      startOfUtcWeek(referenceDate),
      endOfUtcDay(referenceDate),
      referenceDate,
      "day",
      "this week",
    );
  }

  if (normalized.includes("last week")) {
    const start = addUtcDays(startOfUtcWeek(referenceDate), -7);
    const end = endOfUtcWeek(start);
    return buildResolvedWindow(start, end, referenceDate, "day", "last week");
  }

  const weeksAgoMatch = normalized.match(/\b(\d+)\s+weeks?\s+ago\b/);
  if (weeksAgoMatch) {
    const weeksAgo = Number.parseInt(weeksAgoMatch[1], 10);
    const start = addUtcDays(startOfUtcWeek(referenceDate), -(weeksAgo * 7));
    const end = endOfUtcWeek(start);
    return buildResolvedWindow(start, end, referenceDate, "day", weeksAgoMatch[0]);
  }

  const pastWeeksMatch = normalized.match(/\bpast\s+(\d+)\s+weeks?\b/);
  if (pastWeeksMatch) {
    const weeks = Number.parseInt(pastWeeksMatch[1], 10);
    const end = endOfUtcDay(referenceDate);
    const start = addUtcDays(end, -((weeks * 7) - 1));
    return buildResolvedWindow(startOfUtcDay(start), end, referenceDate, weeks <= 2 ? "day" : "week", pastWeeksMatch[0]);
  }

  const pastMonthsMatch = normalized.match(/\bpast\s+(\d+)\s+months?\b/);
  if (pastMonthsMatch) {
    const months = Number.parseInt(pastMonthsMatch[1], 10);
    return resolveMonthCountWindow(months, referenceDate, pastMonthsMatch[0]);
  }

  if (normalized.includes("past month")) {
    return resolveMonthCountWindow(1, referenceDate, "past month");
  }

  const pastDaysMatch = normalized.match(/\bpast\s+(\d+)\s+days?\b/);
  if (pastDaysMatch) {
    const days = Number.parseInt(pastDaysMatch[1], 10);
    const end = endOfUtcDay(referenceDate);
    const start = addUtcDays(end, -(days - 1));
    return buildResolvedWindow(startOfUtcDay(start), end, referenceDate, "day", pastDaysMatch[0]);
  }

  if (normalized.includes("this month")) {
    return buildResolvedWindow(
      startOfUtcMonth(referenceDate),
      endOfUtcDay(referenceDate),
      referenceDate,
      "day",
      "this month",
    );
  }

  if (normalized.includes("past year") || normalized.includes("last year")) {
    return resolveMonthCountWindow(12, referenceDate, normalized.includes("past year") ? "past year" : "last year");
  }

  const end = endOfUtcDay(referenceDate);
  const start = addUtcDays(end, -29);
  return buildResolvedWindow(startOfUtcDay(start), end, referenceDate, "day", "past 30 days");
}

export function resolveExplicitTimeWindow(
  startDate: string,
  endDate: string,
  referenceDate: Date,
  grain?: TimeGrain | "auto",
) {
  const start = startOfUtcDay(new Date(startDate));
  const end = endOfUtcDay(new Date(endDate));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid start_date or end_date supplied to get_sales_data.");
  }

  return buildResolvedWindow(
    start,
    end,
    referenceDate,
    grain && grain !== "auto" ? grain : undefined,
  );
}

export function resolveRelativeTimeWindow(
  value: number,
  unit: RelativeTimeUnit,
  referenceDate: Date,
) {
  const safeValue = Math.max(1, Math.floor(value));

  if (unit === "day") {
    return resolveTimeWindowFromPrompt(`past ${safeValue} days`, referenceDate);
  }

  if (unit === "week") {
    return resolveTimeWindowFromPrompt(`past ${safeValue} weeks`, referenceDate);
  }

  return resolveTimeWindowFromPrompt(`past ${safeValue} months`, referenceDate);
}
