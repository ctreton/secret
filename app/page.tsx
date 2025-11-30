
import Link from "next/link";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/draw-sessions");
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 py-8 sm:py-16 text-center px-4">
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          Organise tes <span className="text-pink-400">Secret Santa</span>{" "}
          sans prise de tête
        </h1>
        <p className="max-w-xl text-xs sm:text-sm text-slate-300">
          Crée plusieurs tirages, gère les groupes, évite les collisions, envoie les mails en un clic.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
        <Link
          href="/register"
          className="rounded-md bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 hover:bg-pink-400"
        >
          Créer un compte
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-100 hover:border-pink-400"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
