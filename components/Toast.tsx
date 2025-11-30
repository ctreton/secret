"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function notify(message: string, type: ToastType = "info") {
  const id = `toast-${++toastId}`;
  const newToast: Toast = { id, message, type };
  toasts = [...toasts, newToast];
  listeners.forEach((listener) => listener(toasts));

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener(toasts));
  }, 3000);
}

export const toast = {
  success: (message: string) => notify(message, "success"),
  error: (message: string) => notify(message, "error"),
  info: (message: string) => notify(message, "info"),
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts);
    };
    listeners.add(listener);
    setCurrentToasts(toasts);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {currentToasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm min-w-[300px] max-w-md animate-in slide-in-from-right ${
            toast.type === "error"
              ? "bg-red-500/90 border-red-600 text-white"
              : toast.type === "success"
              ? "bg-green-500/90 border-green-600 text-white"
              : "bg-blue-500/90 border-blue-600 text-white"
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

