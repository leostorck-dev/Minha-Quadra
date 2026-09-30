import type { Metadata } from "next";

export function noIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false, nocache: true },
  };
}
