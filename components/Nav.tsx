"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Products" },
  { href: "/upload", label: "Upload" },
  { href: "/batches", label: "Batches" },
  { href: "/ledger", label: "Ledger" },
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
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        <span className="font-bold text-green-700 text-lg mr-2">NatureLite IMS</span>
        <nav className="flex gap-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                pathname === l.href
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="sm" onClick={logout} className="text-gray-500">
          Logout
        </Button>
      </div>
    </header>
  );
}
