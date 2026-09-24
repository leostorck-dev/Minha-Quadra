import { CourtDetail } from "@/components/court-detail";
import { getAuthContext } from "@/lib/auth/context";

export default async function CourtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, context] = await Promise.all([params, getAuthContext()]);
  return (
    <CourtDetail
      id={id}
      canEdit={context?.role === "OWNER" || context?.role === "MANAGER"}
    />
  );
}
