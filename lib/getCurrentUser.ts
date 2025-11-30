import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as { id: string; email?: string | null; name?: string | null };
}
