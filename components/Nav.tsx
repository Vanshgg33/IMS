"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Upload, Archive, BookOpen, LogOut, Leaf } from "lucide-react";

const links = [
  { href: "/",        label: "Products", icon: LayoutGrid },
  { href: "/upload",  label: "Upload",   icon: Upload },
  { href: "/batches", label: "Batches",  icon: Archive },
  { href: "/ledger",  label: "Ledger",   icon: BookOpen },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      style={{
        background: "var(--nl-green-dark)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">

        {/* Brand mark */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none", flexShrink: 0, marginRight: "8px" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "rgba(180,83,9,0.2)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(180,83,9,0.4)",
          }}>
            <Leaf size={15} color="#F59E0B" />
          </div>
          <div style={{ lineHeight: 1 }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "13.5px", fontWeight: 700, color: "#FDF8F0", margin: 0 }}>
              NatureLite
            </p>
            <p style={{ fontSize: "9.5px", color: "var(--nl-sidebar-muted)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Inventory
            </p>
          </div>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: "2px", flex: 1 }}>
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 11px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: active ? 700 : 500,
                  color: active ? "#F59E0B" : "var(--nl-sidebar)",
                  background: active ? "rgba(180,83,9,0.15)" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s",
                  borderBottom: active ? "2px solid #F59E0B" : "2px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "#FDF8F0";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--nl-sidebar)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <l.icon size={14} style={{ flexShrink: 0 }} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 11px",
            borderRadius: "7px",
            fontSize: "12.5px", fontWeight: 600,
            color: "var(--nl-sidebar-muted)",
            background: "none", border: "none", cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "#FDF8F0";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--nl-sidebar-muted)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </header>
  );
}
