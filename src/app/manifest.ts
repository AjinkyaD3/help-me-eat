import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoodSpin",
    short_name: "FoodSpin",
    description: "Decide what to eat with a spin.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F5F6",
    theme_color: "#1F7A4D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
