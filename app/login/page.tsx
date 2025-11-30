// app/login/page.tsx
import LoginClient from "./LoginClient";

export const metadata = {
  title: "Connexion"
};

export default function Page() {
  return (
  <>
    <LoginClient />
    <p className="text-sm text-slate-400 text-center mt-3">
      Pas encore de compte ?{" "}
      <a className="text-pink-400 hover:underline" href="/register">
        S'inscrire
      </a>
    </p>
    </>
  );
}