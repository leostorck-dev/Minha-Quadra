import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";

export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role === "COACH") redirect("/dashboard");
  return children;
}
