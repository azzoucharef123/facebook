"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        closeButton
        expand
        richColors
        position="top-center"
        toastOptions={{
          className: "!bg-slate-900 !text-slate-100 !border !border-slate-700"
        }}
      />
    </>
  );
}
