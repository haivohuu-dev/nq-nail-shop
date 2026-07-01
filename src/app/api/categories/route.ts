import { NextResponse } from "next/server";
import { db, categories } from "@/db";
import { categoryInput } from "@/lib/validation";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const parsed = categoryInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [created] = await db.insert(categories).values(parsed.data).returning();
  return NextResponse.json(created, { status: 201 });
}
