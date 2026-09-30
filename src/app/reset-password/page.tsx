import { redirect } from "next/navigation";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { noIndexMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = noIndexMetadata("Definir nova senha");

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");

  return <PasswordRecoveryForm mode="reset" />;
}
