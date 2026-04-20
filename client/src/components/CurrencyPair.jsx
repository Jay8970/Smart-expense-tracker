import { formatMoney } from "../utils/api.js";

export default function CurrencyPair({ values }) {
  return (
    <span className="currency-pair">
      <span className="currency-badge cad">{formatMoney(values?.CAD || 0, "CAD")}</span>
      <span className="currency-badge inr">{formatMoney(values?.INR || 0, "INR")}</span>
    </span>
  );
}
