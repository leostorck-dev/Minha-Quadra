import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicBookingFlow } from "@/components/public-booking-flow";
import {
  getPublicArena,
  getPublicBrand,
} from "@/features/public-bookings/service";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const brand = await getPublicBrand(slug);
    if (!brand) return { title: "Reservas" };
    return {
      title: `Reservar horário em ${brand.name}`,
      description: `Consulte os horários disponíveis e envie sua solicitação de reserva para ${brand.name}.`,
      alternates: { canonical: `/reservar/${brand.slug}` },
      openGraph: {
        title: `Reservar horário em ${brand.name}`,
        description:
          "Escolha a quadra e o horário. A arena confirma a solicitação.",
      },
    };
  } catch {
    return { title: "Reservas" };
  }
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params;
  const [arena, brand] = await Promise.all([
    getPublicArena(slug),
    getPublicBrand(slug),
  ]);
  if (!arena || !brand) notFound();

  return <PublicBookingFlow initialArena={arena} brand={brand} />;
}
