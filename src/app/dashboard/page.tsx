"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 800, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>TenderPoint Dashboard</h1>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Welcome back. Start by uploading a tender or updating your company profile.
      </p>

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/dashboard/upload"
          style={{
            padding: "10px 14px",
            background: "#166534",
            color: "white",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Upload Tender
        </Link>

        <Link
          href="/dashboard/company"
          style={{
            padding: "10px 14px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
            color: "black",
          }}
        >
          Company Profile
        </Link>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}