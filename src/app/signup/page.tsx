import { AuthForm } from "@/components/auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return <AuthForm mode="signup" inviteToken={invite} />;
}
