"use client";
import { useEffect, useState } from "react";
import { Mail, Plus, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

type Status = { type: "success" | "error"; msg: string } | null;

export default function SettingsPage() {
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setEmails(Array.isArray(d.alertEmails) ? d.alertEmails : []))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  }, []);

  function addEmail() {
    const val = input.trim().toLowerCase();
    if (!isValidEmail(val)) {
      setStatus({ type: "error", msg: "Enter a valid email address." });
      return;
    }
    if (emails.includes(val)) {
      setStatus({ type: "error", msg: "This email is already in the list." });
      return;
    }
    setEmails((prev) => [...prev, val]);
    setInput("");
    setStatus(null);
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
    setStatus(null);
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertEmails: emails }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setEmails(Array.isArray(data.alertEmails) ? data.alertEmails : emails);
      setStatus({ type: "success", msg: "Alert recipients saved." });
    } catch (e) {
      setStatus({ type: "error", msg: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: "560px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--nl-text)", margin: 0, letterSpacing: "-0.01em" }}>
          Settings
        </h1>
        <p style={{ fontSize: "13px", color: "var(--nl-text-3)", marginTop: "3px" }}>
          Configure system preferences
        </p>
      </div>

      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid var(--nl-border)", borderRadius: "12px", overflow: "hidden" }}>

        {/* Card header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--nl-border)", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", background: "var(--nl-amber-light)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mail size={15} color="var(--nl-amber)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--nl-text)" }}>Low Stock Alert Recipients</p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--nl-text-3)", marginTop: "1px" }}>
              These addresses receive an email when any SKU hits its reorder level.
            </p>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: "20px 22px" }}>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--nl-text-3)", fontSize: "13px" }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              Loading…
            </div>
          ) : (
            <>
              {/* Email list */}
              {emails.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                  {emails.map((email) => (
                    <div key={email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "var(--nl-green-light)", border: "1px solid rgba(20,83,45,0.1)", borderRadius: "8px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--nl-text)", fontFamily: "var(--font-mono)" }}>
                        {email}
                      </span>
                      <button
                        onClick={() => removeEmail(email)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#B91C1C", padding: "2px 4px", borderRadius: "4px", display: "flex", alignItems: "center" }}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {emails.length === 0 && (
                <p style={{ fontSize: "13px", color: "var(--nl-text-3)", marginBottom: "14px", fontStyle: "italic" }}>
                  No recipients added yet.
                </p>
              )}

              {/* Add input */}
              <div style={{ display: "flex", gap: "8px" }}>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setStatus(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                  style={{ flex: 1, fontSize: "13.5px" }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEmail}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}
                >
                  <Plus size={14} />
                  Add
                </Button>
              </div>

              {/* Status message */}
              {status && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "12.5px", color: status.type === "success" ? "var(--nl-green)" : "#B91C1C" }}>
                  {status.type === "success"
                    ? <CheckCircle size={13} />
                    : <AlertCircle size={13} />}
                  {status.msg}
                </div>
              )}
            </>
          )}
        </div>

        {/* Card footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--nl-border)", display: "flex", justifyContent: "flex-end" }}>
          <Button
            onClick={save}
            disabled={saving || loading}
            style={{ background: "var(--nl-amber)", color: "#fff", fontWeight: 700, minWidth: "90px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
