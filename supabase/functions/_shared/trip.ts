export const TRIP_SCHEMA_VERSION = 1;

export type TripSubExpense = {
  name: string;
  amount: number;
};

export type TripExpense = {
  id: number;
  name: string;
  amount: number;
  subExpenses: TripSubExpense[];
  paidBy: string;
  splitAmong: string[];
  date: string;
};

export type TripSnapshot = {
  schemaVersion: number;
  title?: string;
  persons: string[];
  expenses: TripExpense[];
};

type ShareLinkRecord = {
  revoked_at: string | null;
  expires_at: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function validateTripSnapshot(
  data: unknown,
): asserts data is TripSnapshot {
  if (!isRecord(data)) {
    throw new Error("INVALID_TRIP_DATA");
  }

  if (data.schemaVersion !== TRIP_SCHEMA_VERSION) {
    throw new Error("UNSUPPORTED_TRIP_SCHEMA");
  }

  if (data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw new Error("INVALID_TRIP_DATA");
    }

    if (data.title.trim().length > 120) {
      throw new Error("INVALID_TRIP_DATA");
    }
  }

  if (!Array.isArray(data.persons) || !Array.isArray(data.expenses)) {
    throw new Error("INVALID_TRIP_DATA");
  }

  const persons = data.persons
    .map((person) => String(person).trim())
    .filter(Boolean);
  const personSet = new Set(persons);

  if (personSet.size !== persons.length) {
    throw new Error("INVALID_TRIP_DATA");
  }

  data.expenses.forEach((expense) => {
    if (!isRecord(expense)) {
      throw new Error("INVALID_TRIP_DATA");
    }

    if (!personSet.has(String(expense.paidBy))) {
      throw new Error("INVALID_TRIP_DATA");
    }

    if (!Array.isArray(expense.splitAmong) || expense.splitAmong.length === 0) {
      throw new Error("INVALID_TRIP_DATA");
    }

    expense.splitAmong.forEach((person) => {
      if (!personSet.has(String(person))) {
        throw new Error("INVALID_TRIP_DATA");
      }
    });

    const amount = roundCurrency(Number(expense.amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("INVALID_TRIP_DATA");
    }

    const subExpenses = Array.isArray(expense.subExpenses)
      ? expense.subExpenses
      : [];
    const subExpenseTotal = roundCurrency(
      subExpenses.reduce((sum, item) => {
        if (!isRecord(item)) {
          throw new Error("INVALID_TRIP_DATA");
        }

        const subAmount = roundCurrency(Number(item.amount));

        if (!Number.isFinite(subAmount) || subAmount <= 0) {
          throw new Error("INVALID_TRIP_DATA");
        }

        return sum + subAmount;
      }, 0),
    );

    if (subExpenses.length > 0 && subExpenseTotal !== amount) {
      throw new Error("INVALID_TRIP_DATA");
    }
  });
}

export async function hashToken(token: string) {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function generateShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function isShareLinkActive(link: ShareLinkRecord) {
  if (link.revoked_at) {
    return false;
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return false;
  }

  return true;
}
