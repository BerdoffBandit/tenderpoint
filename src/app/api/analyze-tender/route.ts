import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as pdfjsLib from "pdfjs-dist";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenderId } = body;

    if (!tenderId) {
      return NextResponse.json(
        { error: "Missing tenderId" },
        { status: 400 }
      );
    }

    // 1. Get tender record from DB
    const { data: tender, error: tenderError } = await supabaseAdmin
      .from("tenders")
      .select("*")
      .eq("id", tenderId)
      .single();

    if (tenderError || !tender) {
      return NextResponse.json(
        { error: "Tender not found" },
        { status: 404 }
      );
    }

    // 2. Download PDF from Supabase Storage
    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from("tenders")
      .download(tender.file_path);

    if (storageError || !fileData) {
      return NextResponse.json(
        { error: `Storage download failed: ${storageError?.message}` },
        { status: 500 }
      );
    }

    // 3. Extract text from PDF
    const arrayBuffer = await fileData.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let extractedText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");

      extractedText += pageText + "\n";
    }

    extractedText = extractedText.trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: "No text could be extracted from PDF" },
        { status: 400 }
      );
    }

    // Limit prompt size for MVP cost/speed control
    const trimmedText = extractedText.slice(0, 15000);

    // 4. Ask OpenAI for structured tender analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an AI tender analysis assistant for South African SMEs.

Read the tender text and return valid JSON only.

Return this exact JSON shape:
{
  "tender_title": "",
  "issuing_body": "",
  "deadline": "",
  "scope_summary": "",
  "evaluation_criteria": "",
  "required_sections": [],
  "required_documents": [],
  "missing_info": []
}

Rules:
- Use plain English.
- If something is unclear, return an empty string.
- required_sections, required_documents, missing_info must always be arrays.
- Do not include markdown.
- Do not include commentary outside JSON.
          `.trim(),
        },
        {
          role: "user",
          content: `Tender text:\n\n${trimmedText}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";

    let parsed: {
      tender_title?: string;
      issuing_body?: string;
      deadline?: string;
      scope_summary?: string;
      evaluation_criteria?: string;
      required_sections?: string[];
      required_documents?: string[];
      missing_info?: string[];
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: content },
        { status: 500 }
      );
    }

    // 5. Save analysis back to DB
    const { error: updateError } = await supabaseAdmin
      .from("tenders")
      .update({
        extracted_text: extractedText,
        tender_title: parsed.tender_title || "",
        issuing_body: parsed.issuing_body || "",
        deadline: parsed.deadline || "",
        scope_summary: parsed.scope_summary || "",
        evaluation_criteria: parsed.evaluation_criteria || "",
        required_sections: parsed.required_sections || [],
        required_documents: parsed.required_documents || [],
        missing_info: parsed.missing_info || [],
        analysis_status: "completed",
      })
      .eq("id", tenderId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save analysis: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tenderId,
      analysis: parsed,
    });
  } catch (error) {
    console.error("ANALYZE_TENDER_ERROR:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}