const TRIAL_LENGTH_DAYS = 14;
const EXPIRY_SOON_THRESHOLD_DAYS = 3;

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const daysUntil = (date) => {
  if (!date) return null;
  const msInDay = 1000 * 60 * 60 * 24;
  return Math.ceil((date.getTime() - Date.now()) / msInDay);
};

export const evaluateAccessStatus = (plan) => {
  if (!plan) {
    return {
      state: "pending",
      headline: "",
      detail: "",
      deadline: null,
      daysRemaining: null,
    };
  }

  const nowDate = new Date();
  const subscriptionExpiresAt = parseDate(plan.subscriptionExpiresAt);
  const trialEndsAt =
    parseDate(plan.trialEndsAt) ||
    (plan.createdAt ? addDays(new Date(plan.createdAt), TRIAL_LENGTH_DAYS) : null);
  const expiryDate = subscriptionExpiresAt || trialEndsAt;

  if (!expiryDate) {
    return {
      state: "active",
      headline: "Subscription status",
      detail: "Your plan is active.",
      deadline: null,
      daysRemaining: null,
    };
  }

  if (expiryDate <= nowDate) {
    const modeLabel = subscriptionExpiresAt ? "subscription" : "trial";
    return {
      state: "expired",
      headline: "Access unavailable",
      detail: `Your ${modeLabel} ended on ${expiryDate.toLocaleDateString()}. Please renew to continue.`,
      deadline: expiryDate,
      daysRemaining: 0,
    };
  }

  const remaining = daysUntil(expiryDate);
  const state =
    remaining !== null && remaining <= EXPIRY_SOON_THRESHOLD_DAYS
      ? "expiring"
      : "active";

  const modeLabel = subscriptionExpiresAt ? "paid plan" : "trial";

  return {
    state,
    headline: subscriptionExpiresAt ? "Subscription active" : "Trial active",
    detail: `${remaining} day${remaining === 1 ? "" : "s"} left on your ${modeLabel} (ends ${expiryDate.toLocaleDateString()}).`,
    deadline: expiryDate,
    daysRemaining: remaining,
  };
};
