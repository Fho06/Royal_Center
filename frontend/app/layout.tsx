// app/layout.tsx
import "./globals.css";
import { Suspense } from "react";
import { CartProvider } from "@/app/context/CartContext";
import { AuthProvider } from "@/app/context/AuthContext";
import Navbar from "@/app/components/navbar/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Perfumería Royal Center C.A.",
              url: "https://royalcenterve.com",
            }),
          }}
        />
      </head>

      <body>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>

            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
