export default function LoadingSpinner({ label = "Loading...", fullHeight = false }) {
  return (
    <div className={`spinner-wrap ${fullHeight ? "spinner-wrap-full" : ""}`} role="status" aria-live="polite">
      <span className="spinner-circle" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
