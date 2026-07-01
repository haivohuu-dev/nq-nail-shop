import { NextResponse } from "next/server";
import { db, services } from "@/db";
import { serviceInput } from "@/lib/validation";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const parsed = serviceInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [created] = await db.insert(services).values(parsed.data).returning();
  return NextResponse.json(created, { status: 201 });
}
