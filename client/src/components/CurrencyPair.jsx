import { formatMoney, getCurrencyLabel } from "../utils/api.js";

export default function CurrencyPair({ values }) {
  return (
    <span className="currency-pair">
      <span className="currency-badge cad">
        <span className="currency-badge-label">{getCurrencyLabel("CAD")}</span>
        <span>{formatMoney(values?.CAD || 0, "CAD")}</span>
      </span>
      <span className="currency-badge inr">
        <span className="currency-badge-label">{getCurrencyLabel("INR")}</span>
        <span>{formatMoney(values?.INR || 0, "INR")}</span>
      </span>
    </span>
  );
}
