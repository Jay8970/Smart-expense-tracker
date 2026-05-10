import { formatMoney, toCad } from "./currency.js";

function monthId(date) {
  const itemDate = new Date(date);
  return `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
}

function monthlySavingNeeded(plan) {
  const now = new Date();
  const target = new Date(plan.targetDate);
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  const safeMonths = Math.max(months, 1);
  const remainingAmount = Math.max(plan.targetAmount - plan.savedAmount, 0);
  return Math.ceil(remainingAmount / safeMonths);
}

export function generateSuggestions(expenses, income, futurePlans, exchangeRates) {
  const suggestions = [];
  const now = new Date();
  const currentMonth = monthId(now);
  const previousMonth = monthId(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const currentMonthExpenses = expenses.filter((expense) => monthId(expense.date) === currentMonth);
  const previousMonthExpenses = expenses.filter((expense) => monthId(expense.date) === previousMonth);
  const totalIncomeCad = income.reduce(
    (total, item) => total + toCad(item.amount, item.currency, exchangeRates),
    0
  );
  const totalExpenseCad = expenses.reduce(
    (total, item) => total + toCad(item.amount, item.currency, exchangeRates),
    0
  );
  const currentMonthExpenseCad = currentMonthExpenses.reduce(
    (total, item) => total + toCad(item.amount, item.currency, exchangeRates),
    0
  );

  if (totalIncomeCad === 0) {
    suggestions.push("Add your income sources so the app can calculate savings and budget suggestions.");
  }

  if (totalIncomeCad > 0 && (totalIncomeCad - totalExpenseCad) / totalIncomeCad < 0.2) {
    suggestions.push("Your savings rate is below 20%. Try setting a fixed monthly saving amount first.");
  }

  const currentCategoryTotals = currentMonthExpenses.reduce((acc, item) => {
    acc[item.category] =
      (acc[item.category] || 0) + toCad(item.amount, item.currency, exchangeRates);
    return acc;
  }, {});

  const previousCategoryTotals = previousMonthExpenses.reduce((acc, item) => {
    acc[item.category] =
      (acc[item.category] || 0) + toCad(item.amount, item.currency, exchangeRates);
    return acc;
  }, {});

  for (const [category, total] of Object.entries(currentCategoryTotals)) {
    const share = currentMonthExpenseCad > 0 ? Math.round((total / currentMonthExpenseCad) * 100) : 0;

    if (category === "Food" && share > 30) {
      suggestions.push(
        `Your food spending is ${share}% of total expenses. Try reducing restaurant visits or plan meals ahead.`
      );
    } else if (share > 35) {
      suggestions.push(`${category} is ${share}% of your monthly expenses. Set a weekly limit for this category.`);
    }
  }

  for (const [category, total] of Object.entries(currentCategoryTotals)) {
    const previousTotal = previousCategoryTotals[category] || 0;
    if (previousTotal > 0 && total > previousTotal) {
      const increasePercent = Math.round(((total - previousTotal) / previousTotal) * 100);
      suggestions.push(
        `Your ${category.toLowerCase()} expenses increased by ${increasePercent}% compared to last month.`
      );
    }
  }

  const smallExpenses = currentMonthExpenses.filter(
    (item) => toCad(item.amount, item.currency, exchangeRates) <= 10
  );
  if (smallExpenses.length >= 5) {
    suggestions.push("Frequent small expenses can add up. Check daily snacks, coffee, or impulse purchases.");
  }

  for (const plan of futurePlans) {
    if (plan.status === "Completed") continue;
    const monthlySaving = monthlySavingNeeded(plan);
    if (monthlySaving > 0) {
      suggestions.push(
        `You need to save ${formatMoney(monthlySaving, plan.currency)} per month to reach your ${plan.title} goal.`
      );
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("Your spending looks balanced. Keep tracking weekly to catch changes early.");
  }

  return suggestions;
}
