import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");

  const context = await getAuthContext();
  if (context) redirect("/dashboard");

  const { data: invite } = await supabase
    .from("staff_invites")
    .select("token")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (invite) redirect(`/join?token=${invite.token}`);

  return <OnboardingForm />;
}
