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
        {/* ✅ Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="48x48"
        />

        {/* ✅ Structured data */}
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
