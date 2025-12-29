export const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateOfBirth = (value) => {
  if (!value) return "-";
  const parsed = parseDateValue(value);
  if (!parsed) return typeof value === "string" ? value : "-";
  return parsed.toLocaleDateString();
};

export const getMemberInitials = (member) => {
  const firstInitial = (member?.firstName || "").trim().charAt(0);
  const lastInitial = (member?.lastName || "").trim().charAt(0);
  const initials = `${firstInitial}${lastInitial}`.trim();
  return initials ? initials.toUpperCase() : "?";
};

export const getAgeGroupFromDob = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = parseDateValue(dateOfBirth);
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasBirthdayPassed) {
    age -= 1;
  }
  if (age < 0) return null;
  if (age < 18) return "UNDER_18";
  if (age <= 39) return "18_TO_39";
  if (age <= 70) return "40_TO_70";
  return "OVER_70";
};

export const getUpcomingBirthdayDate = (dateOfBirth, startDate = new Date()) => {
  const dob = parseDateValue(dateOfBirth);
  if (!dob) return null;
  const base = parseDateValue(startDate) || new Date();
  const year = base.getFullYear();
  const month = dob.getMonth();
  const day = dob.getDate();
  let nextBirthday = new Date(year, month, day);
  if (nextBirthday < base) {
    nextBirthday = new Date(year + 1, month, day);
  }
  return nextBirthday;
};

export const formatUpcomingBirthday = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
