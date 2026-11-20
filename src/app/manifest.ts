import type { MetadataRoute } from "next";

// Makes the app installable ("Add to Home screen" / "Install app")
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/student/poles/scan",
    name: "IMS Pole Scanner",
    short_name: "Pole Scanner",
    description: "Scan, pin and map electric poles for EE-IMS.",
    start_url: "/student/poles/scan",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0e11",
    theme_color: "#0e0e11",
    categories: ["education", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan a pole", url: "/student/poles/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pole map", url: "/poles/map", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
