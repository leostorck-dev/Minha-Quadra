import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/agenda",
        "/customers",
        "/courts",
        "/classes",
        "/finance",
        "/memberships",
        "/tournaments",
        "/audit",
        "/settings",
        "/onboarding",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/join",
        "/auth/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
