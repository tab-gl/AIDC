import { useEffect, useRef, useState, type FormEvent } from "react";

type Props = {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: { name: string; description: string; origin_url?: string }) => Promise<void>;
};

export function CreateApplicationModal({ open, busy, error, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(""); setDescription(""); setOriginUrl("");
    const timer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    await onCreate({
      name: name.trim(),
      description: description.trim(),
      origin_url: originUrl.trim() || undefined
    });

  };

  return (
    <div className="neo-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="neo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-app-title"
        aria-describedby="create-app-description"
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="neo-modal-head">
          <div>
            <span className="neo-kicker">New application</span>
            <h2 id="create-app-title">Create a real client</h2>
          </div>
          <button type="button" className="neo-icon-button" onClick={onClose} disabled={busy} aria-label="Close create application dialog">×</button>
        </div>

        <p id="create-app-description" className="neo-modal-note">
          This creates the application through the server. Neo never fabricates
          client IDs or local application records.
        </p>

        <form onSubmit={submit} className="neo-form">
          <label>
            Application name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My application"
              autoFocus
            />
          </label>

          <label>
            Description
            <textarea
              maxLength={2000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this application is used for"
            />
            <small>{description.length}/2000</small>
          </label>

          <label>
            Origin URL
            <input
              inputMode="url"
              type="url"
              value={originUrl}
              onChange={(event) => setOriginUrl(event.target.value)}
              placeholder="https://example.com"
            />
            <small>Use the public base URL for this application. Configure exact redirect URIs in its settings after creation.</small>
          </label>

          {error && <div className="neo-form-error" role="alert">{error}</div>}

          <div className="neo-modal-actions">
            <button type="button" className="neo-button neo-button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="neo-button neo-button-primary" disabled={busy || !name.trim()}>
              {busy ? "Creating application…" : "Create application"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
