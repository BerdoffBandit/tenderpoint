"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!email || !password) {
      setMsg("Enter email + password.");
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return setMsg(error.message);
      setMsg("Account created. Now log in.");
      setMode("login");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);

    router.push("/dashboard");
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>TenderPoint</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        {mode === "login" ? "Log in to continue" : "Create your account"}
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <button
        style={{ marginTop: 12 }}
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        Switch to {mode === "login" ? "Sign up" : "Log in"}
      </button>
    </div>
  );
}