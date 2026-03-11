"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UploadTenderPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleUpload() {
    try {
      setStatus("");

      if (!file) {
        setStatus("Please select a PDF file first.");
        return;
      }

      if (file.type !== "application/pdf") {
        setStatus("Only PDF files are allowed.");
        return;
      }

      setUploading(true);

      // Get logged in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus("You must be logged in to upload a tender.");
        setUploading(false);
        return;
      }

      // Create a unique file path
      const safeFileName = file.name.replace(/\s+/g, "_");
      const filePath = `${user.id}/${Date.now()}_${safeFileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("tenders")
        .upload(filePath, file);

      if (uploadError) {
        setStatus(`Upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      // Get public URL (works only if bucket is public)
      // For private buckets, this may be blank for now and that's okay.
      const { data: publicUrlData } = supabase.storage
        .from("tenders")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData?.publicUrl ?? null;

      // Save tender record in DB
      const { error: insertError } = await supabase.from("tenders").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_url: fileUrl,
        status: "uploaded",
      });

      if (insertError) {
        setStatus(`Database save failed: ${insertError.message}`);
        setUploading(false);
        return;
      }

      setStatus("Tender uploaded successfully ✅");
      setFile(null);

      // Optional: redirect later
      // router.push("/dashboard");
    } catch (error) {
      console.error(error);
      setStatus("Something went wrong during upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Upload Tender</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Upload a security tender PDF to begin analysis.
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 12,
          display: "grid",
          gap: 12,
          background: "#fff",
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] ?? null;
            setFile(selectedFile);
          }}
        />

        {file && (
          <div style={{ fontSize: 14 }}>
            <strong>Selected file:</strong> {file.name}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: uploading ? "#999" : "#166534",
            color: "white",
            cursor: uploading ? "not-allowed" : "pointer",
            width: "fit-content",
          }}
        >
          {uploading ? "Uploading..." : "Upload Tender"}
        </button>

        {status && (
          <p style={{ marginTop: 8, fontSize: 14 }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}