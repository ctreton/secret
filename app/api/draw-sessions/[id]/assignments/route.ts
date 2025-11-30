
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkDrawSessionAccess } from "@/lib/checkDrawSessionAccess";

export async function GET(
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

  const assignments = await prisma.assignment.findMany({
    where: { drawSessionId: id },
    include: { giver: { include: { groups: { include: { group: true } } } }, receiver: true },
    orderBy: { giver: { name: "asc" } },
  });

  return NextResponse.json(assignments);
}
