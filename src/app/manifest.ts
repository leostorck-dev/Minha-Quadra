import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minha Quadra",
    short_name: "Minha Quadra",
    description: "Gestão de arenas esportivas.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b3f34",
    theme_color: "#0f6b46",
    lang: "pt-BR",
    icons: [
      {
        src: "/minha-quadra-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/minha-quadra-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
