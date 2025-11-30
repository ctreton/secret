
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cfg = await prisma.smtpConfig.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(cfg ?? {});
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { host, port, secure, userName, password, sender } = body;

  const cfg = await prisma.smtpConfig.upsert({
    where: { userId: user.id },
    update: { host, port, secure, userName, password, sender },
    create: {
      userId: user.id,
      host,
      port,
      secure,
      userName,
      password,
      sender,
    },
  });

  return NextResponse.json(cfg);
}
