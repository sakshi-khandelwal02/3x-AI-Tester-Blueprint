import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/ai/parseResume";
import {
  extractTextFromResumeFile,
  isSupportedResumeFile,
  SUPPORTED_RESUME_FORMATS_LABEL,
} from "@/lib/resume/extractText";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const textOverride = formData.get("text") as string | null;

      if (textOverride) {
        const { profile, aiPowered } = await parseResume(textOverride);
        return NextResponse.json({ profile, aiPowered });
      }

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (!isSupportedResumeFile(file.name, file.type || undefined)) {
        return NextResponse.json(
          {
            error: `Unsupported file type. Please upload ${SUPPORTED_RESUME_FORMATS_LABEL}.`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      let text: string;

      try {
        text = await extractTextFromResumeFile(buffer, file.name, file.type || undefined);
      } catch (extractError) {
        console.error("Resume text extraction failed:", extractError);
        const detail =
          extractError instanceof Error ? extractError.message : "Unknown extraction error";
        return NextResponse.json(
          {
            error: `Could not extract text from file: ${detail}. Try ${SUPPORTED_RESUME_FORMATS_LABEL}.`,
          },
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
      return NextResponse.json({ profile, aiPowered });
    }

    const body = await request.json();
    if (!body.text) {
      return NextResponse.json({ error: "Resume text required" }, { status: 400 });
    }

    const { profile, aiPowered } = await parseResume(body.text);
    return NextResponse.json({ profile, aiPowered });
  } catch (error) {
    console.error("Resume parse error:", error);
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}
