// app/api/media/upload/route.ts
//
// Handles media file uploads for the admin. Validates type, compresses images
// to WebP (via sharp), stores to /public/uploads/, and creates a MediaAsset row.
// Admin-only — requires a valid session cookie.

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getCurrentSession } from "../../../../lib/auth/cookies";
import { db } from "../../../../lib/db";

// Max sizes: 10 MB for images, 20 MB for PDFs.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

// Allowed MIME types per media type.
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const PDF_MIME = "application/pdf";

// Max output dimensions for images (longest edge). Keeps files small on the
// public site without throwing away detail for full-bleed backgrounds.
const MAX_DIMENSION: Record<string, number> = {
  AVATAR: 400,
  COVER: 1200,
  BACKGROUND: 1600,
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  // Auth — admin only (route handler; use session check, not redirect-throwing requireAdmin).
  const { user } = await getCurrentSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const type = (formData.get("type") as string | null)?.toUpperCase() ?? "";
  const file = formData.get("file");

  // Validate media type.
  const validTypes = ["AVATAR", "BACKGROUND", "COVER", "CV"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid media type." }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const isCV = type === "CV";
  const mime = file.type;

  if (isCV) {
    if (mime !== PDF_MIME) {
      return NextResponse.json({ error: "CV must be a PDF." }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF too large (max 20 MB)." }, { status: 400 });
    }
  } else {
    if (!IMAGE_MIMES.has(mime)) {
      return NextResponse.json(
        { error: "Images must be JPEG, PNG, WebP, GIF, or SVG." },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large (max 10 MB)." }, { status: 400 });
    }
  }

  // Ensure upload directory exists.
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  let filename: string;
  let outputBuffer: Buffer;

  if (isCV) {
    // PDFs stored as-is.
    filename = `${randomUUID()}.pdf`;
    outputBuffer = bytes;
  } else if (mime === "image/svg+xml") {
    // SVGs stored as-is (sharp can't meaningfully process them).
    filename = `${randomUUID()}.svg`;
    outputBuffer = bytes;
  } else {
    // All raster images → WebP, resized to max dimension for this type.
    const maxDim = MAX_DIMENSION[type] ?? 1200;
    filename = `${randomUUID()}.webp`;
    outputBuffer = await sharp(bytes)
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  }

  const destPath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(destPath, outputBuffer);

  const url = `/uploads/${filename}`;

  const asset = await db.mediaAsset.create({
    data: {
      type: type as "AVATAR" | "BACKGROUND" | "COVER" | "CV",
      url,
      filename: file.name,
      isActive: false,
      version: 1,
    },
  });

  return NextResponse.json({ id: asset.id, url });
}
