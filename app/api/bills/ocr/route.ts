import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const preferredRegion = "auto";
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { success } = await checkRateLimit("ocr", user.id);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again in a minute." }, { status: 429 });
  }

  const { storagePath, billType, signedUrl, fileName } = await request.json();
  if (signedUrl && !storagePath) {
    return NextResponse.json({ error: "signedUrl is no longer accepted. Send storagePath instead." }, { status: 400 });
  }
  if (!storagePath || typeof storagePath !== "string") {
    return NextResponse.json({ error: "storagePath is required" }, { status: 400 });
  }

  if (storagePath.startsWith("/") || storagePath.includes("..")) {
    return NextResponse.json({ error: "Invalid storagePath" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  if (!storagePath.startsWith(`${profile.org_id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: signed, error: signErr } = await supabase.storage
      .from("bills")
      .createSignedUrl(storagePath, 600);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not generate signed URL" }, { status: 500 });
    }

    let fileBuffer: ArrayBuffer;
    try {
      console.log("[OCR Route] Generated signed URL successfully. Downloading file...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55_000);
      const fileRes = await fetch(signed.signedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!fileRes.ok) {
        return NextResponse.json({ error: `Failed to fetch bill from storage: ${fileRes.status}` }, { status: 500 });
      }
      fileBuffer = await fileRes.arrayBuffer();
    } catch (downloadErr: any) {
      console.error("Supabase download error:", downloadErr);
      return NextResponse.json(
        { error: `SUPABASE_DOWNLOAD_FAILED: ${downloadErr?.message ?? "Unknown error"}. Please enter values manually.` },
        { status: 500 }
      );
    }

    let response;
    try {
      console.log("[OCR Route] Starting manual enqueue via Axios for model:", process.env.MINDEE_MODEL_ID);
      
      const FormData = (await import("form-data")).default;
      const axios = (await import("axios")).default;
      
      const form = new FormData();
      form.append("file", Buffer.from(fileBuffer), { filename: fileName || "bill.pdf" });
      if (process.env.MINDEE_MODEL_ID) {
        form.append("model_id", process.env.MINDEE_MODEL_ID);
      }

      // 1. Enqueue
      const enqueueRes = await axios.post(
        "https://api.mindee.net/v2/products/ocr/enqueue",
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Token ${process.env.MINDEE_API_KEY}`,
          },
          timeout: 60000,
        }
      );
      
      const jobId = enqueueRes.data?.job?.id;
      if (!jobId) throw new Error("Failed to get job ID from Mindee");
      
      console.log("[OCR Route] Job enqueued:", jobId);
      
      // 2. Poll
      let docResult;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const jobRes = await axios.get(`https://api.mindee.net/v2/jobs/${jobId}`, {
          headers: { Authorization: `Token ${process.env.MINDEE_API_KEY}` },
        });
        
        const status = jobRes.data?.job?.status;
        console.log(`[OCR Route] Polling... status: ${status}`);
        if (status === "Processed" || status === "completed") {
          const resultUrl = jobRes.data?.job?.resultUrl;
          if (resultUrl) {
             const finalRes = await axios.get(resultUrl, {
               headers: { Authorization: `Token ${process.env.MINDEE_API_KEY}` },
             });
             docResult = finalRes.data;
          } else {
             docResult = jobRes.data;
          }
          break;
        }
        if (status === "Failed" || status === "failed") {
          throw new Error("Mindee processing failed");
        }
      }
      
      if (!docResult) throw new Error("Polling timeout");
      response = docResult;
      console.log("[OCR Route] manual processing finished successfully.");
    } catch (mindeeErr: any) {
      console.error("Mindee OCR error:", mindeeErr?.response?.data || mindeeErr);
      return NextResponse.json(
        { error: `MINDEE_API_FAILED: ${mindeeErr?.message ?? "Unknown error"}. Please enter values manually.` },
        { status: 500 }
      );
    }

    // Each OcrPage has a .content string (full page text) and .words array
    const pages = (response as any).inference.result?.pages ?? [];
    const fullText = pages
      .map((p: any) => p.content ?? p.words?.map((w: any) => w.content ?? "").join(" ") ?? "")
      .join(" ");

    const validationFailedType = validateBillType(fullText, billType);
    if (validationFailedType) {
      return NextResponse.json(
        { error: `Validation Failed: The uploaded document does not appear to be a ${validationFailedType} bill.` },
        { status: 422 }
      );
    }

    const supplier = extractSupplier(fullText);
    const amount_due = extractAmount(fullText);
    const bill_period = extractDate(fullText);
    const { usage, unit: detectedUnit } = extractUsage(fullText);

    const unitDefaults: Record<string, string> = {
      electricity: "kWh", gas: "kWh", water: "m3",
      fuel_diesel: "litre", fuel_petrol: "litre",
    };
    const unit = detectedUnit ?? unitDefaults[billType] ?? "kWh";

    return NextResponse.json({
      supplier,
      bill_period,
      usage,
      unit,
      amount_due,
      account_number: null,
      raw: { pages },
    });

  } catch (err: any) {
    console.error("Mindee OCR error:", err?.message ?? err);
    return NextResponse.json(
      { error: `OCR failed: ${err?.message ?? "Unknown error"}. Please enter values manually.` },
      { status: 500 }
    );
  }
}

function extractSupplier(text: string): string | null {
  const known = [
    "British Gas", "EDF Energy", "EDF", "E.ON", "EON", "Octopus Energy",
    "OVO Energy", "Shell Energy", "Scottish Power", "SSE", "npower",
    "Bulb", "Centrica", "Thames Water", "Severn Trent", "United Utilities",
    "Anglian Water", "Southern Water", "Yorkshire Water",
  ];
  for (const s of known) {
    if (text.toLowerCase().includes(s.toLowerCase())) return s;
  }
  return null;
}

function extractAmount(text: string): number | null {
  const m = text.match(/(?:total|amount due|balance due|please pay)[^\d£]*£?\s*(\d[\d,]*\.?\d*)/i)
    ?? text.match(/£\s*(\d[\d,]*\.\d{2})/);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

function extractDate(text: string): string | null {
  const m = text.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
  return m ? m[1] : null;
}

function extractUsage(text: string): { usage: number | null; unit: string | null } {
  const kwh = text.match(/(\d[\d,]*\.?\d*)\s*kWh/i);
  if (kwh) return { usage: parseFloat(kwh[1].replace(/,/g, "")), unit: "kWh" };

  const litre = text.match(/(\d[\d,]*\.?\d*)\s*litre/i);
  if (litre) return { usage: parseFloat(litre[1].replace(/,/g, "")), unit: "litre" };

  const m3 = text.match(/(\d[\d,]*\.?\d*)\s*m[³3]/i);
  if (m3) return { usage: parseFloat(m3[1].replace(/,/g, "")), unit: "m3" };

  return { usage: null, unit: null };
}

function validateBillType(text: string, billType: string): string | null {
  const t = text.toLowerCase();

  const countGas = (t.match(/\bgas\b/g) || []).length;
  const countElec = (t.match(/\belectricity\b|\belectric\b/g) || []).length;
  const countWater = (t.match(/\bwater\b|\bsewerage\b/g) || []).length;
  const countDiesel = (t.match(/\bdiesel\b|\bderve\b/g) || []).length;
  const countPetrol = (t.match(/\bpetrol\b|\bunleaded\b/g) || []).length;

  switch (billType) {
    case "electricity":
      if (countElec === 0 && countGas > 0) return "Electricity";
      if (countGas > countElec * 2 && countGas > 1) return "Electricity";
      if (countElec === 0) return "Electricity";
      break;
    case "gas":
      if (countGas === 0 && countElec > 0) return "Gas";
      if (countElec > countGas * 2 && countElec > 1) return "Gas";
      if (countGas === 0) return "Gas";
      break;
    case "water":
      if (countWater === 0) return "Water";
      break;
    case "fuel_diesel":
      if (countDiesel === 0) return "Diesel";
      break;
    case "fuel_petrol":
      if (countPetrol === 0) return "Petrol";
      break;
  }
  return null;
}
