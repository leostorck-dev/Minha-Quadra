import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { noIndexMetadata } from "@/lib/metadata";

export const metadata = noIndexMetadata("Recuperar senha");

export default function ForgotPasswordPage() {
  return <PasswordRecoveryForm mode="request" />;
}
