
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { sendAllForSession } from "@/lib/mailer";
import { checkDrawSessionAccess } from "@/lib/checkDrawSessionAccess";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { hasAccess } = await checkDrawSessionAccess(id, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await sendAllForSession(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erreur lors de l'envoi des mails" },
      { status: 400 }
    );
  }
}
