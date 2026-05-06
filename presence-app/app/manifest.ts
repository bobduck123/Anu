import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Presence Studio",
    short_name: "Presence",
    description: "Manage your creative portfolio and professional presence",
    start_url: "/studio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#1c1917",
    background_color: "#1c1917",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
