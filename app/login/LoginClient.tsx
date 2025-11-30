"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}