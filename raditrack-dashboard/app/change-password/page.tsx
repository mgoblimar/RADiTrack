import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ChangePasswordForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Change password · RADiTrack" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AuthLayout
      title={user.mustChangePassword ? "Set your password" : "Change password"}
      subtitle={
        user.mustChangePassword
          ? `Welcome, ${user.fullName}. Replace your temporary password before you continue.`
          : "Choose a new password for your RADiTrack account."
      }
    >
      <ChangePasswordForm username={user.username} />
      {!user.mustChangePassword && (
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="font-bold text-qc-blue hover:underline">
            Back to the dashboard
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
