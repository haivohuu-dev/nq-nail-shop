import { NextResponse } from "next/server";
import { db, settings } from "@/db";
import { settingsInput } from "@/lib/validation";
import { eq } from "drizzle-orm";

async function getOrCreate() {
  const rows = await db.select().from(settings).limit(1);
  if (rows.length) return rows[0];
  const [created] = await db.insert(settings).values({}).returning();
  return created;
}

export async function GET() {
  return NextResponse.json(await getOrCreate());
}

export async function PUT(req: Request) {
  const parsed = settingsInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const current = await getOrCreate();
  const [updated] = await db
    .update(settings)
    .set(parsed.data)
    .where(eq(settings.id, current.id))
    .returning();
  return NextResponse.json(updated);
}
