import { prisma } from "@/lib/prisma";
import AdminSetupClient from "./AdminSetupClient";

export default async function AdminSetupGate({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifier s'il y a des admins dans la base
  const adminCount = await prisma.user.count({
    where: { isAdmin: true },
  });

  // Si aucun admin, afficher le formulaire de setup au lieu du contenu
  if (adminCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <AdminSetupClient />
        </div>
      </div>
    );
  }

  // Sinon, afficher le contenu normal
  return <>{children}</>;
}


