import { redirect } from "next/navigation";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");

  return <PasswordRecoveryForm mode="reset" />;
}
