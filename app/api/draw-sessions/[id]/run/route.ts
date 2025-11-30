
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { runDraw } from "@/lib/draw";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await runDraw(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erreur pendant le tirage" },
      { status: 400 }
    );
  }
}
