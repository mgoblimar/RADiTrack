import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Sign in · RADiTrack" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/");

  return (
    <AuthLayout title="Sign in" subtitle="Use the username and password from your RADiTrack administrator.">
      <LoginForm />
    </AuthLayout>
  );
}
