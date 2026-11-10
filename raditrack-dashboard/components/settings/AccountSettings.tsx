"use client";

import Link from "next/link";
import { ChevronRight, KeyRound, UserRound } from "lucide-react";
import {
  ROLE_LABELS,
  isAdmin,
  type CurrentUser,
} from "@/lib/auth/roles";
import { MODALITY_CONFIG } from "@/lib/enums";
import type { ReactNode } from "react";

interface AccountSettingsProps {
  currentUser: CurrentUser;
}

function modalityName(code: string): string {
  return MODALITY_CONFIG[
    code as keyof typeof MODALITY_CONFIG
  ]?.shortName ?? code;
}

const panel =
  "overflow-hidden rounded-[24px] border border-[#DDE3F2] bg-white shadow-[0_4px_18px_rgba(24,41,140,0.05)]";

/**
 * The signed-in user's own settings:
 * account details and password management.
 */
export function AccountSettings({
  currentUser,
}: AccountSettingsProps) {
  const modalities = currentUser.assignedModalities;

  return (
    <div className="w-full space-y-5">
      {/* Full-width settings layout */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">

        {/* Account information */}
        <section
          aria-labelledby="account-heading"
          className={panel}
        >
          {/* Section header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF4] bg-[linear-gradient(110deg,#F9FAFE_0%,#F5F7FD_65%,#FFF9E9_100%)] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
                <UserRound className="h-5 w-5" />
              </span>

              <div>
                <h2
                  id="account-heading"
                  className="text-lg font-extrabold tracking-tight text-qc-navy"
                >
                  Account information
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your profile and assigned access
                </p>
              </div>
            </div>

            <span className="rounded-full border border-qc-blue/15 bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-qc-blue">
              Read only
            </span>
          </div>

          {/* Account details */}
          <div className="p-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <Detail
                label="Full name"
                value={currentUser.fullName}
              />

              <Detail
                label="Username"
                value={
                  <span className="font-mono text-[13px]">
                    {currentUser.username}
                  </span>
                }
              />

              <Detail
                label="Role"
                value={ROLE_LABELS[currentUser.role]}
              />

              <Detail
                label="Assigned modalities"
                className="sm:col-span-2 2xl:col-span-3"
                value={
                  modalities.length === 0 ? (
                    <span className="inline-flex rounded-full bg-qc-blue/10 px-3 py-1 text-xs font-extrabold text-qc-blue">
                      All modalities
                    </span>
                  ) : (
                    <span className="flex flex-wrap gap-2">
                      {modalities.map((code, index) => (
                        <span
                          key={code}
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                            index === 0
                              ? "bg-qc-navy text-white"
                              : "border border-qc-blue/10 bg-qc-blue/10 text-qc-blue"
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

            {/* Account access information */}
            <div className="mt-4 rounded-xl border border-[#EFE7DA] bg-[#FAF6EF] px-4 py-3">
              <p className="text-xs leading-relaxed text-[#766B5E]">
                {modalities.length > 0
                  ? `Your dashboard and backlog start on ${modalityName(modalities[0])}. You can switch to any modality at any time.`
                  : "Your dashboard and backlog start on all modalities."}{" "}
                {isAdmin(currentUser)
                  ? "To update your account details or assigned modalities, go to Configurations → Accounts."
                  : "To change your account details or assigned modalities, contact the RADiTrack administrator."}
              </p>
            </div>
          </div>
        </section>

        {/* Password section */}
        <section
          aria-labelledby="password-heading"
          className={`${panel} p-5 sm:p-6`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-qc-yellow/20 text-qc-navy">
              <KeyRound className="h-5 w-5" />
            </span>

            <div>
              <h2
                id="password-heading"
                className="text-lg font-extrabold tracking-tight text-qc-navy"
              >
                Password
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sign-in security
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#E8ECF4] bg-[#FAFBFD] p-4">
            <p className="text-sm font-bold text-qc-navy">
              Keep your account secure
            </p>

            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Update your password regularly to help protect your RADiTrack account.
            </p>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Changing your password keeps you signed in on this device and signs out your other devices.
          </p>

          <Link
            href="/change-password"
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-qc-navy px-5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(5,14,64,0.16)] transition-all hover:-translate-y-0.5 hover:bg-qc-blue hover:shadow-[0_8px_18px_rgba(0,53,122,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow"
          >
            Change password
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-[#E8ECF4] bg-[#FAFBFD] px-4 py-3 ${className}`}
    >
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>

      <dd className="mt-2 break-words text-sm font-bold leading-relaxed text-qc-navy">
        {value}
      </dd>
    </div>
  );
}