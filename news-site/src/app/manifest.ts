import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elevate",
    short_name: "Elevate",
    description: "Multilingual news aggregator for India: English, Hindi, Tamil, Bengali, Malayalam, Gujarati and Marathi.",
    start_url: "/admin-news/en",
    scope: "/admin-news/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    lang: "en-IN",
    categories: ["news", "magazines"],
    icons: [
      { src: "/admin-news/elevate-pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/admin-news/elevate-pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [

      { name: "Latest news", short_name: "Latest", url: "/en" },
    ],
  };
}
