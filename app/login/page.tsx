"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Wrong password");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #1B3A2D 0%, #14532D 40%, #1a3a28 70%, #0f2d1e 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden",
      fontFamily: "var(--font-body)",
    }}>
      {/* Decorative rings */}
      <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "420px", height: "420px", borderRadius: "50%", border: "1px solid rgba(180,83,9,0.14)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "300px", height: "300px", borderRadius: "50%", border: "1px solid rgba(180,83,9,0.09)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "360px", height: "360px", borderRadius: "50%", border: "1px solid rgba(180,83,9,0.09)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "30%", left: "10%", width: "160px", height: "160px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.03)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "380px", position: "relative", zIndex: 1 }} className="fade-up">

        {/* Brand mark */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "56px", height: "56px",
            background: "rgba(180,83,9,0.18)", borderRadius: "16px",
            marginBottom: "16px", border: "1px solid rgba(180,83,9,0.35)",
          }}>
            <Leaf size={26} color="#F59E0B" />
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700,
            color: "#FDF8F0", letterSpacing: "-0.02em", margin: 0,
          }}>
            NatureLite IMS
          </h1>
          <p style={{ color: "rgba(253,248,240,0.38)", fontSize: "12px", marginTop: "5px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Inventory Management
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(253,250,245,0.97)",
          borderRadius: "18px",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          border: "1px solid rgba(229,217,195,0.6)",
        }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--nl-text)", marginBottom: "22px" }}>
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--nl-text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "var(--nl-text-3)", pointerEvents: "none" }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  style={{
                    width: "100%",
                    background: "var(--nl-cream-2)",
                    border: "1px solid var(--nl-border)",
                    borderRadius: "10px",
                    padding: "10px 14px 10px 40px",
                    fontSize: "14px",
                    color: "var(--nl-text)",
                    outline: "none",
                    fontFamily: "var(--font-body)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = "var(--nl-amber)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,83,9,0.09)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = "var(--nl-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "8px", padding: "9px 13px", fontSize: "13px", color: "#B91C1C", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "rgba(180,83,9,0.55)" : "var(--nl-amber)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "11px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)",
                transition: "background 0.15s, transform 0.1s",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--nl-amber-hover)"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--nl-amber)"; }}
              onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.98)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              {loading ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", color: "rgba(253,248,240,0.22)" }}>
          NatureLite Foods · Secure Access
        </p>
      </div>
    </div>
  );
}
