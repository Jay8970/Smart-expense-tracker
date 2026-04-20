export const categoryIcons = {
  Food: "🍽",
  Rent: "⌂",
  Travel: "✈",
  Shopping: "◈",
  Fuel: "⛽",
  Bills: "▣",
  Education: "✎",
  Entertainment: "♪",
  Health: "+",
  Salary: "$",
  Freelance: "↗",
  "Part-time job": "◷",
  "Family support": "♡",
  Other: "•"
};

export function getCategoryIcon(category) {
  return categoryIcons[category] || categoryIcons.Other;
}
