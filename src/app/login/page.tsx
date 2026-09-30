import { AuthForm } from "@/components/auth-form";
import { noIndexMetadata } from "@/lib/metadata";

export const metadata = noIndexMetadata("Entrar");

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return <AuthForm mode="login" inviteToken={invite} />;
}
