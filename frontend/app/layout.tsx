import "./globals.css";
import { Suspense } from "react";
import { CartProvider } from "@/app/context/CartContext";
import { AuthProvider } from "@/app/context/AuthContext";
import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
