export default function Toast({ toasts, onClose, onAction }) {
  if (!toasts?.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type || "success"}`} key={toast.id}>
          <p>{toast.message}</p>
          <div className="toast-actions">
            {toast.actionLabel && (
              <button type="button" onClick={() => onAction(toast.id)}>
                {toast.actionLabel}
              </button>
            )}
            <button aria-label="Dismiss notification" type="button" onClick={() => onClose(toast.id)}>X</button>
          </div>
        </div>
      ))}
    </div>
  );
}
