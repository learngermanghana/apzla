export const memberAgeGroupOptions = [
  { value: "UNDER_18", label: "Under 18" },
  { value: "18_TO_39", label: "18 - 39" },
  { value: "40_TO_70", label: "40 - 70" },
  { value: "OVER_70", label: "Over 70" },
];

export const memberStatusOptions = [
  { value: "VISITOR", label: "Visitors", helper: "First-time guests and newcomers" },
  { value: "NEW_CONVERT", label: "New converts", helper: "Recently committed" },
  { value: "REGULAR", label: "Regulars", helper: "Consistently attending" },
  { value: "WORKER", label: "Workers", helper: "Serving team members" },
  { value: "PASTOR", label: "Pastors", helper: "Pastoral staff" },
  { value: "ELDER", label: "Elders", helper: "Leadership team" },
  { value: "OTHER", label: "Other", helper: "Custom status" },
  { value: "INACTIVE", label: "Inactive", helper: "Needs engagement" },
];

export const memberAgeGroupDescriptions = {
  UNDER_18: "Kids and teens",
  "18_TO_39": "Young adults",
  "40_TO_70": "Adults",
  OVER_70: "Seniors",
};
