import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrderFlow",
  description: "Distributor PO, Sales, PPIC, Production, Inventory and Shipment control",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
