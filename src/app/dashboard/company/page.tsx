"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type CompanyProfile = {
  legal_name: string;
  registration_number: string;
  vat_number: string;
  csd_number: string;
  sars_pin: string;
  physical_address: string;
  postal_address: string;
  contact_name: string;
  contact_position: string;
  contact_email: string;
  contact_phone: string;
};

const empty: CompanyProfile = {
  legal_name: "",
  registration_number: "",
  vat_number: "",
  csd_number: "",
  sars_pin: "",
  physical_address: "",
  postal_address: "",
  contact_name: "",
  contact_position: "",
  contact_email: "",
  contact_phone: "",
};

export default function CompanyVaultPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile>(empty);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return router.replace("/login");

      const { data, error } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setStatus(error.message);
        return;
      }

      if (data) {
        setProfile({
          legal_name: data.legal_name ?? "",
          registration_number: data.registration_number ?? "",
          vat_number: data.vat_number ?? "",
          csd_number: data.csd_number ?? "",
          sars_pin: data.sars_pin ?? "",
          physical_address: data.physical_address ?? "",
          postal_address: data.postal_address ?? "",
          contact_name: data.contact_name ?? "",
          contact_position: data.contact_position ?? "",
          contact_email: data.contact_email ?? "",
          contact_phone: data.contact_phone ?? "",
        });
      }
    })();
  }, [router]);

  function updateField<K extends keyof CompanyProfile>(key: K, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    setStatus("Saving...");

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return router.replace("/login");

    // Upsert = insert if missing, update if exists
    const { error } = await supabase.from("company_profiles").upsert({
      user_id: user.id,
      ...profile,
      updated_at: new Date().toISOString(),
    });

    if (error) setStatus(error.message);
    else setStatus("Saved ✅");
  }

  return (
    <div style={{ maxWidth: 820, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Company Vault (MVP)</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Fill this once. We’ll reuse it to autofill SBD forms.
      </p>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input placeholder="Company Legal Name" value={profile.legal_name} onChange={(e) => updateField("legal_name", e.target.value)} />
        <input placeholder="Registration Number" value={profile.registration_number} onChange={(e) => updateField("registration_number", e.target.value)} />
        <input placeholder="VAT Number (optional)" value={profile.vat_number} onChange={(e) => updateField("vat_number", e.target.value)} />
        <input placeholder="CSD Number" value={profile.csd_number} onChange={(e) => updateField("csd_number", e.target.value)} />
        <input placeholder="SARS PIN" value={profile.sars_pin} onChange={(e) => updateField("sars_pin", e.target.value)} />

        <input placeholder="Physical Address" value={profile.physical_address} onChange={(e) => updateField("physical_address", e.target.value)} />
        <input placeholder="Postal Address" value={profile.postal_address} onChange={(e) => updateField("postal_address", e.target.value)} />

        <input placeholder="Contact Person Name" value={profile.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} />
        <input placeholder="Contact Person Position" value={profile.contact_position} onChange={(e) => updateField("contact_position", e.target.value)} />
        <input placeholder="Contact Email" value={profile.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} />
        <input placeholder="Contact Phone" value={profile.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} />

        <button onClick={save}>Save Company Vault</button>
        {status && <p>{status}</p>}
      </div>
    </div>
  );
}