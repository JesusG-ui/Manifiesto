import "./globals.css";
import { ToastProvider } from "../components/Toast";

export const metadata = {
  title: "Manifiesto de Reparto",
  description: "Panel de despacho y reparto",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
        />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
      </head>
      <body>
        <ToastProvider>
          <div id="app-shell">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
