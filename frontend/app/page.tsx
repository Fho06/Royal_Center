import { Suspense } from "react";
import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Perfumería Royal Center C.A. – Página Oficial",
  description:
    "Productos destacados en Perfumería Royal Center C.A. Compra bebidas, alimentos y productos esenciales al mejor precio.",
};
  

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <HomeClient />
    </Suspense>
  );
}
