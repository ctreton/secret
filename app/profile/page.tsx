import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/profile");
  }

  // Récupérer les données complètes de l'utilisateur
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!userData) {
    redirect("/login");
  }

  return <ProfileClient initialUser={userData} />;
}

