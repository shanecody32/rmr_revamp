import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import "./globals.css";

export const metadata: Metadata = {
  title: "RMR Revamp",
  description: "RMR Revamp - Rust/Axum/SeaORM/Seography Backend with Next.js/Ant Design Frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
