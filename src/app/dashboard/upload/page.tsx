"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UploadTenderPage() {
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

      console.log("AUTH USER ERROR:", userError);
      console.log("CURRENT USER:", user);
      console.log("USER ID BEING USED:", user?.id);

      if (userError) {
        setStatus(`Auth error: ${userError.message}`);
        setUploading(false);
        return;
      }

      if (!user) {
        setStatus("No logged-in user found. Please log in again.");
        setUploading(false);
        return;
      }

      // Create a unique file path
      const safeFileName = file.name.replace(/\s+/g, "_");
      const filePath = `${user.id}/${Date.now()}_${safeFileName}`;

      console.log("FILE PATH:", filePath);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tenders")
        .upload(filePath, file, {
          upsert: false,
        });

      console.log("STORAGE UPLOAD DATA:", uploadData);
      console.log("STORAGE UPLOAD ERROR:", uploadError);

      if (uploadError) {
        setStatus(`Storage upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      // Public URL (fine for public bucket; if private, this may not be usable later)
      const { data: publicUrlData } = supabase.storage
        .from("tenders")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData?.publicUrl ?? null;

      console.log("PUBLIC URL:", fileUrl);

      // Save tender record in DB
      const tenderPayload = {
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_url: fileUrl,
        status: "uploaded",
      };

      console.log("INSERT PAYLOAD:", tenderPayload);

      const { data: insertData, error: insertError } = await supabase
        .from("tenders")
        .insert(tenderPayload)
        .select();

      console.log("DB INSERT DATA:", insertData);
      console.log("DB INSERT ERROR:", insertError);

      if (insertError) {
        setStatus(`Database save failed: ${insertError.message}`);
        setUploading(false);
        return;
      }

      setStatus("Tender uploaded successfully ✅");
      setFile(null);
    } catch (error) {
      console.error("UNEXPECTED UPLOAD ERROR:", error);
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
            console.log("SELECTED FILE:", selectedFile);
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