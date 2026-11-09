"use client";

import Link from "next/link";
import { ChevronRight, KeyRound, UserRound } from "lucide-react";
import { ROLE_LABELS, isAdmin, type CurrentUser } from "@/lib/auth/roles";
import { MODALITY_CONFIG } from "@/lib/enums";

interface AccountSettingsProps {
  currentUser: CurrentUser;
}

function modalityName(code: string): string {
  return MODALITY_CONFIG[code as keyof typeof MODALITY_CONFIG]?.shortName ?? code;
}

const panel =
  "rounded-[24px] border border-[#DDE3F2] bg-white shadow-[0_4px_18px_rgba(24,41,140,0.05)]";

/** The signed-in user's own settings: account details and password. */
export function AccountSettings({ currentUser }: AccountSettingsProps) {
  const modalities = currentUser.assignedModalities;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-qc-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account details and sign-in.</p>
      </div>

      <div className="space-y-4">
        {/* Account details (read-only; the administrator changes them) */}
        <section aria-labelledby="account-heading" className={`${panel} p-5 sm:p-6`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-blue/10 text-qc-blue">
              <UserRound className="h-5 w-5" />
            </span>
            <h2 id="account-heading" className="text-lg font-extrabold text-qc-navy">
              Account
            </h2>
          </div>

          <dl className="mt-5 divide-y divide-border text-sm">
            <Detail label="Name" value={currentUser.fullName} />
            <Detail label="Username" value={<span className="font-mono">{currentUser.username}</span>} />
            <Detail label="Role" value={ROLE_LABELS[currentUser.role]} />
            <Detail
              label="Assigned modalities"
              value={
                modalities.length === 0 ? (
                  <span className="text-muted-foreground">All modalities</span>
                ) : (
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {modalities.map((code, index) => (
                      <span
                        key={code}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          index === 0 ? "bg-qc-navy text-white" : "bg-qc-blue/10 text-qc-blue"
                        }`}
                      >
                        {modalityName(code)}
                      </span>
                    ))}
                  </span>
                )
              }
            />
          </dl>

          <p className="mt-4 rounded-xl bg-muted/50 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            {modalities.length > 0
              ? `Your dashboard and backlog start on ${modalityName(modalities[0])}. You can switch to any modality at any time.`
              : "Your dashboard and backlog start on all modalities."}{" "}
            {isAdmin(currentUser)
              ? "Change these details under Configurations → Accounts."
              : "To change these details, ask the RADiTrack administrator."}
          </p>
        </section>

        {/* Password: opens the dedicated change-password page */}
        <section aria-labelledby="password-heading" className={`${panel} p-5 sm:p-6`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-yellow/20 text-qc-navy">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 id="password-heading" className="text-lg font-extrabold text-qc-navy">
                  Password
                </h2>
                <p className="text-xs text-muted-foreground">
                  Changing it keeps you signed in here and signs out your other devices.
                </p>
              </div>
            </div>
            <Link
              href="/change-password"
              className="inline-flex h-11 w-fit shrink-0 items-center gap-1.5 rounded-xl bg-qc-navy px-4 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(5,14,64,0.18)] transition-colors hover:bg-qc-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow"
            >
              Change password
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-bold text-qc-navy">{value}</dd>
    </div>
  );
}
