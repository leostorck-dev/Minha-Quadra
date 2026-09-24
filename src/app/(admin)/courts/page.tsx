import { CourtList } from "@/components/court-list";
import { getAuthContext } from "@/lib/auth/context";

export default async function CourtsPage() {
  const context = await getAuthContext();
  return (
    <CourtList
      canEdit={context?.role === "OWNER" || context?.role === "MANAGER"}
    />
  );
}
