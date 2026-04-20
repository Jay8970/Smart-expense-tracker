export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className={`toast ${toast.type || "success"}`}>
      <p>{toast.message}</p>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
}
