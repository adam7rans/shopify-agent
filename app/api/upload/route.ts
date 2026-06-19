import { writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const safeName = `upload-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const destDir = join(process.cwd(), "public", "mock-invoices");
  const destPath = join(destDir, safeName);

  await writeFile(destPath, buffer);

  return Response.json({ filename: safeName });
}
