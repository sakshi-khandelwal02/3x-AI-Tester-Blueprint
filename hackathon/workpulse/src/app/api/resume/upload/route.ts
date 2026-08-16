import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/auth/api-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, RESUME_STORAGE_BUCKET } from "@/lib/supabase/config";
import { saveResumeUploadToDb } from "@/lib/db/app-state";
import { parseResume } from "@/lib/ai/parseResume";
import {
  extractTextFromResumeFile,
  isSupportedResumeFile,
  SUPPORTED_RESUME_FORMATS_LABEL,
} from "@/lib/resume/extractText";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Persistent storage is not configured. Use /api/resume/parse for local demo mode." },
      { status: 503 }
    );
  }

  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const textOverride = formData.get("text") as string | null;

    if (textOverride?.trim()) {
      const { profile, aiPowered } = await parseResume(textOverride);
      const supabase = await createSupabaseServerClient();
      const demoName = `demo_${Date.now()}.txt`;
      const storagePath = `${auth.userId}/${uuidv4()}_${demoName}`;

      await supabase.storage.from(RESUME_STORAGE_BUCKET).upload(
        storagePath,
        new Blob([textOverride], { type: "text/plain" }),
        { contentType: "text/plain", upsert: false }
      );

      const { version } = await saveResumeUploadToDb(supabase, auth.userId, {
        filename: demoName,
        storagePath,
        fileType: "text/plain",
        rawText: textOverride,
        parsedProfile: profile,
        email: auth.email,
        firstName: auth.user.user_metadata?.first_name as string | undefined,
      });

      return NextResponse.json({ profile, aiPowered, version, persisted: true });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isSupportedResumeFile(file.name, file.type || undefined)) {
      return NextResponse.json(
        { error: `Unsupported file type. Please upload ${SUPPORTED_RESUME_FORMATS_LABEL}.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

    try {
      text = await extractTextFromResumeFile(buffer, file.name, file.type || undefined);
    } catch (extractError) {
      const detail =
        extractError instanceof Error ? extractError.message : "Unknown extraction error";
      return NextResponse.json(
        { error: `Could not extract text from file: ${detail}.` },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file. The document may be empty or image-only." },
        { status: 400 }
      );
    }

    const { profile, aiPowered } = await parseResume(text);
    const supabase = await createSupabaseServerClient();
    const safeName = sanitizeFilename(file.name);
    const storagePath = `${auth.userId}/${uuidv4()}_${safeName}`;

    const uploadResult = await supabase.storage
      .from(RESUME_STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadResult.error) {
      console.error("Storage upload failed:", uploadResult.error);
      return NextResponse.json({ error: "Failed to store resume file." }, { status: 503 });
    }

    const { version } = await saveResumeUploadToDb(supabase, auth.userId, {
      filename: file.name,
      storagePath,
      fileType: file.type || file.name.split(".").pop(),
      rawText: text,
      parsedProfile: profile,
      email: auth.email,
      firstName: auth.user.user_metadata?.first_name as string | undefined,
    });

    return NextResponse.json({
      profile,
      aiPowered,
      version,
      persisted: true,
      resume: {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        fileType: file.type || file.name.split(".").pop(),
      },
    });
  } catch (error) {
    console.error("Resume upload failed:", error);
    return NextResponse.json({ error: "Failed to upload and parse resume." }, { status: 500 });
  }
}
