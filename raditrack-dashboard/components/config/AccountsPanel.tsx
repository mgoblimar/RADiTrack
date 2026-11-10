"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Power,
  UsersRound,
  X,
} from "lucide-react";

import {
  createAccountAction,
  listAccountsAction,
  resetAccountPasswordAction,
  setAccountActiveAction,
  updateAccountAction,
  type AccountResult,
  type AccountSummary,
} from "@/app/actions/accounts";

import {
  ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from "@/lib/auth/roles";

import {
  MODALITY_CONFIG,
  MODALITY_ORDER,
} from "@/lib/enums";

/* =========================================================
   TYPES
========================================================= */

interface AccountsPanelProps {
  currentUserId: string;
}

interface DraftAccount {
  fullName: string;
  username: string;
  role: UserRole;
  assignedModalities: string[];
}

const EMPTY_DRAFT: DraftAccount = {
  fullName: "",
  username: "",
  role: "RADIOLOGIST",
  assignedModalities: [],
};

const ROLE_GROUPS: ReadonlyArray<{
  role: UserRole;
  title: string;
  empty: string;
}> = [
  {
    role: "RADIOLOGIST",
    title: "Radiologists",
    empty: "No radiologist accounts yet.",
  },
  {
    role: "RESIDENT",
    title: "Residents",
    empty: "No resident accounts yet.",
  },
  {
    role: "ADMIN",
    title: "Administrators",
    empty: "No administrator accounts yet.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function modalityName(code: string): string {
  return (
    MODALITY_CONFIG[code as keyof typeof MODALITY_CONFIG]
      ?.shortName ?? code
  );
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return "Never";

  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* =========================================================
   MAIN ACCOUNTS PANEL
========================================================= */

/** Administrator page for creating doctors' accounts and assigning modalities. */
export function AccountsPanel({
  currentUserId,
}: AccountsPanelProps) {
  const [accounts, setAccounts] =
    useState<AccountSummary[] | null>(null);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [editing, setEditing] = useState<{
    userId: string | null;
    draft: DraftAccount;
  } | null>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [issuedPassword, setIssuedPassword] =
    useState<{
      username: string;
      password: string;
    } | null>(null);

  const [notice, setNotice] = useState<{
    text: string;
    tone: "ok" | "error";
  } | null>(null);

  const [isPending, startTransition] =
    useTransition();

  /* =========================================================
     LOAD ACCOUNTS
  ========================================================= */

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        setAccounts(await listAccountsAction());
        setLoadError(null);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load accounts.",
        );
      }
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* =========================================================
     ACTION FEEDBACK
  ========================================================= */

  const handleResult = (
    result: AccountResult,
    username: string,
    successText: string,
  ) => {
    if (!result.success) {
      setNotice({
        text: result.error,
        tone: "error",
      });

      return false;
    }

    if (result.temporaryPassword) {
      setIssuedPassword({
        username,
        password: result.temporaryPassword,
      });
    }

    setNotice({
      text: successText,
      tone: "ok",
    });

    refresh();

    return true;
  };

  /* =========================================================
     SAVE ACCOUNT
  ========================================================= */

  const saveDraft = () => {
    if (!editing) return;

    const { userId, draft } = editing;

    setFormError(null);

    startTransition(async () => {
      const result = userId
        ? await updateAccountAction(userId, draft)
        : await createAccountAction(draft);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      setEditing(null);

      handleResult(
        result,
        draft.username.trim().toLowerCase(),
        userId
          ? `Saved ${draft.fullName}.`
          : `Created an account for ${draft.fullName}.`,
      );
    });
  };

  /* =========================================================
     RESET PASSWORD
  ========================================================= */

  const resetPassword = (account: AccountSummary) => {
    if (
      !confirm(
        `Reset ${account.fullName}'s password? They will be signed out and must set a new one.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      handleResult(
        await resetAccountPasswordAction(account.userId),
        account.username,
        `Reset ${account.fullName}'s password.`,
      );
    });
  };

  /* =========================================================
     ACTIVATE / DEACTIVATE ACCOUNT
  ========================================================= */

  const toggleActive = (account: AccountSummary) => {
    const next = !account.isActive;

    if (
      !next &&
      !confirm(
        `Deactivate ${account.fullName}? They will be signed out and can't sign in.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      handleResult(
        await setAccountActiveAction(
          account.userId,
          next,
        ),
        account.username,
        `${account.fullName} is now ${
          next ? "active" : "deactivated"
        }.`,
      );
    });
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="overflow-hidden rounded-[26px] border border-[#DDE3F2] bg-white shadow-[0_4px_20px_rgba(0,53,122,0.05)]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="flex flex-col gap-4 border-b border-[#E7EAF1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_65%,#FFF9E9_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <div className="min-w-0">
          <h3 className="text-xl font-extrabold tracking-tight text-qc-navy">
            ACCOUNTS
          </h3>
        </div>

        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setFormError(null);

            setEditing({
              userId: null,
              draft: EMPTY_DRAFT,
            });
          }}
          disabled={isPending}
          className="inline-flex h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-qc-navy px-4 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-qc-blue disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow"
        >
          <Plus className="h-4 w-4 text-qc-yellow" />
          Add account
        </button>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="space-y-5 p-4 sm:p-5">

        {/* Action feedback */}
        {notice && (
          <div
            role={
              notice.tone === "error"
                ? "alert"
                : "status"
            }
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
              notice.tone === "ok"
                ? "border-qc-blue/15 bg-qc-blue/[0.05] text-qc-blue"
                : "border-red-200 bg-red-50 text-qc-red"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {notice.tone === "ok" ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </span>

            <span>{notice.text}</span>
          </div>
        )}

        {/* Temporary password */}
        {issuedPassword && (
          <TemporaryPasswordCard
            username={issuedPassword.username}
            password={issuedPassword.password}
            onDismiss={() => setIssuedPassword(null)}
          />
        )}

        {/* New account form */}
        {editing && editing.userId === null && (
          <AccountForm
            draft={editing.draft}
            isNew
            isSelf={false}
            error={formError}
            isPending={isPending}
            onChange={(draft) =>
              setEditing((current) =>
                current
                  ? { ...current, draft }
                  : current,
              )
            }
            onCancel={() => setEditing(null)}
            onSave={saveDraft}
          />
        )}

        {/* Loading error */}
        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-qc-red"
          >
            {loadError}
          </div>
        )}

        {/* Loading */}
        {accounts === null && !loadError && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-qc-blue/20 border-t-qc-blue" />

            <p className="mt-3 text-sm font-medium text-slate-500">
              Loading accounts...
            </p>
          </div>
        )}

        {/* Empty state */}
        {accounts !== null && accounts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#DDE3F2] bg-[#F8FAFD] px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-qc-blue/[0.07] text-qc-blue">
              <UsersRound className="h-6 w-6" />
            </div>

            <h4 className="mt-3 text-sm font-extrabold text-qc-navy">
              No accounts yet
            </h4>

            <p className="mt-1 text-xs text-slate-500">
              Create an account to give a staff member access
              to RADiTrack.
            </p>

            <button
              type="button"
              onClick={() => {
                setFormError(null);

                setEditing({
                  userId: null,
                  draft: EMPTY_DRAFT,
                });
              }}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-qc-navy px-4 text-xs font-bold text-white transition-colors hover:bg-qc-blue"
            >
              <Plus className="h-3.5 w-3.5 text-qc-yellow" />
              Add first account
            </button>
          </div>
        )}

        {/* Account groups */}
        {accounts !== null && accounts.length > 0 && (
          <div className="space-y-6">

            {ROLE_GROUPS.map((group) => {
              const members = accounts.filter(
                (account) => account.role === group.role,
              );

              return (
                <section
                  key={group.role}
                  aria-labelledby={`group-${group.role}`}
                  className="space-y-3"
                >

                  {/* Group heading */}
                  <div className="flex items-center justify-between gap-3 border-b border-[#E7EAF1] pb-2.5">
                    <h4
                      id={`group-${group.role}`}
                      className="text-sm font-extrabold text-qc-navy"
                    >
                      {group.title}
                    </h4>

                    <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-qc-blue/[0.07] px-2.5 py-1 text-xs font-extrabold text-qc-blue">
                      {members.length}
                    </span>
                  </div>

                  {/* Empty role group */}
                  {members.length === 0 && (
                    <p className="rounded-xl border border-dashed border-[#DDE3F2] bg-[#FAFBFD] px-4 py-3 text-xs text-slate-500">
                      {group.empty}
                    </p>
                  )}

                  {/* Account list */}
                  {members.length > 0 && (
                    <ul className="space-y-2.5">
                      {members.map((account) => {
                        const isEditingThis =
                          editing?.userId === account.userId;

                        return (
                          <li
                            key={account.userId}
                            className={`overflow-hidden rounded-2xl border transition-colors ${
                              isEditingThis
                                ? "border-qc-yellow/60 bg-qc-yellow/[0.025]"
                                : "border-[#E4E8F1] bg-white hover:border-qc-blue/20"
                            }`}
                          >
                            <AccountRow
                              account={account}
                              isSelf={
                                account.userId === currentUserId
                              }
                              isEditing={isEditingThis}
                              isPending={isPending}
                              onEdit={() => {
                                setNotice(null);
                                setFormError(null);

                                setEditing({
                                  userId: account.userId,
                                  draft: {
                                    fullName: account.fullName,
                                    username: account.username,
                                    role: account.role,
                                    assignedModalities:
                                      account.assignedModalities,
                                  },
                                });
                              }}
                              onResetPassword={() =>
                                resetPassword(account)
                              }
                              onToggleActive={() =>
                                toggleActive(account)
                              }
                            />

                            {isEditingThis && editing && (
                              <AccountForm
                                draft={editing.draft}
                                isNew={false}
                                editingLabel={`${account.fullName} (${account.username})`}
                                isSelf={
                                  account.userId === currentUserId
                                }
                                error={formError}
                                isPending={isPending}
                                onChange={(draft) =>
                                  setEditing((current) =>
                                    current
                                      ? { ...current, draft }
                                      : current,
                                  )
                                }
                                onCancel={() =>
                                  setEditing(null)
                                }
                                onSave={saveDraft}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                </section>
              );
            })}

          </div>
        )}

      </div>
    </section>
  );
}

/* =========================================================
   ACCOUNT ROW
========================================================= */

interface AccountRowProps {
  account: AccountSummary;
  isSelf: boolean;
  isEditing: boolean;
  isPending: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
}

function AccountRow({
  account,
  isSelf,
  isEditing,
  isPending,
  onEdit,
  onResetPassword,
  onToggleActive,
}: AccountRowProps) {
  return (
    <div
      className={`grid min-w-0 gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(190px,1.15fr)_minmax(180px,0.9fr)_auto] lg:items-center lg:gap-5 ${
        isEditing
          ? "bg-qc-yellow/[0.07]"
          : account.isActive
            ? "bg-white"
            : "bg-slate-50/70"
      }`}
    >

      {/* Identity and status */}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-extrabold ${
              account.isActive
                ? "text-qc-navy"
                : "text-slate-500"
            }`}
          >
            {account.fullName}
          </span>

          {isSelf && (
            <Badge tone="blue">
              You
            </Badge>
          )}

          {!account.isActive && (
            <Badge tone="slate">
              Deactivated
            </Badge>
          )}

          {account.isActive &&
            account.mustChangePassword && (
              <Badge tone="amber">
                Must set password
              </Badge>
            )}

          {account.isLocked && (
            <Badge tone="red">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
        </p>

        <p className="mt-1 font-mono text-xs text-slate-500">
          {account.username}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Last sign-in: {formatLastLogin(account.lastLoginAt)}
        </p>
      </div>

      {/* Assigned modalities */}
      <div className="min-w-0">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Assigned modalities
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {account.assignedModalities.length === 0 ? (
            <span className="rounded-lg bg-[#F1F4F8] px-2.5 py-1 text-xs font-semibold text-slate-600">
              All modalities
            </span>
          ) : (
            account.assignedModalities.map((code, index) => (
              <span
                key={code}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                  index === 0
                    ? "bg-qc-navy text-white"
                    : "bg-qc-blue/[0.07] text-qc-blue"
                }`}
                title={
                  index === 0
                    ? "Default dashboard view"
                    : undefined
                }
              >
                {modalityName(code)}
                {index === 0 && (
                  <span className="ml-1 opacity-75">
                    · Default
                  </span>
                )}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF1F6] pt-3 lg:justify-end lg:border-0 lg:pt-0">
        {!isEditing && (
          <RowButton
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="Edit"
            disabled={isPending}
            onClick={onEdit}
          />
        )}

        {!isSelf && (
          <>
            <RowButton
              icon={<KeyRound className="h-3.5 w-3.5" />}
              label="Reset password"
              disabled={isPending || !account.isActive}
              onClick={onResetPassword}
            />

            <RowButton
              icon={<Power className="h-3.5 w-3.5" />}
              label={
                account.isActive
                  ? "Deactivate"
                  : "Activate"
              }
              tone={
                account.isActive
                  ? "danger"
                  : "default"
              }
              disabled={isPending}
              onClick={onToggleActive}
            />
          </>
        )}
      </div>

    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function Badge({
  tone,
  children,
}: {
  tone: "navy" | "blue" | "slate" | "amber" | "red";
  children: ReactNode;
}) {
  const tones = {
    navy: "bg-qc-navy text-white",
    blue: "bg-qc-blue/10 text-qc-blue",
    slate: "bg-slate-200 text-slate-600",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-qc-red",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* =========================================================
   ROW ACTION BUTTON
========================================================= */

interface RowButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

function RowButton({
  icon,
  label,
  onClick,
  disabled,
  tone = "default",
}: RowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
        tone === "danger"
          ? "border-red-200 bg-red-50/60 text-qc-red hover:bg-red-50"
          : "border-[#DDE3F2] bg-white text-qc-navy hover:border-qc-blue/30 hover:bg-qc-blue/[0.025] hover:text-qc-blue"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* =========================================================
   ACCOUNT FORM
========================================================= */

interface AccountFormProps {
  draft: DraftAccount;
  isNew: boolean;
  editingLabel?: string;
  isSelf: boolean;
  error: string | null;
  isPending: boolean;
  onChange: (draft: DraftAccount) => void;
  onCancel: () => void;
  onSave: () => void;
}

function AccountForm({
  draft,
  isNew,
  editingLabel,
  isSelf,
  error,
  isPending,
  onChange,
  onCancel,
  onSave,
}: AccountFormProps) {
  const inputClass =
    "mt-1.5 h-11 w-full rounded-xl border border-[#DDE3F2] bg-white px-3.5 text-sm font-semibold text-qc-navy outline-none transition-colors placeholder:text-slate-400 focus:border-qc-blue/40 focus:ring-2 focus:ring-qc-blue/10";

  // Click order is kept: the first modality picked becomes the default view.
  const toggleModality = (code: string) => {
    const has = draft.assignedModalities.includes(code);

    onChange({
      ...draft,
      assignedModalities: has
        ? draft.assignedModalities.filter(
            (c) => c !== code,
          )
        : [...draft.assignedModalities, code],
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      aria-label={
        editingLabel
          ? `Edit ${editingLabel}`
          : "New account"
      }
      className={
        editingLabel
          ? "relative border-t border-[#E9D68B] bg-[#FFFDF5] p-4 sm:p-5"
          : "rounded-2xl border border-[#DDE3F2] bg-[#F8FAFD] p-4 sm:p-5"
      }
    >
      {editingLabel && (
        <span
          className="absolute inset-y-0 left-0 w-1 bg-qc-yellow"
          aria-hidden
        />
      )}

      {/* Form heading */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-qc-blue">
            {isNew ? "Staff access" : "Account details"}
          </p>

          <h4 className="mt-0.5 truncate text-base font-extrabold text-qc-navy">
            {editingLabel
              ? `Editing ${editingLabel}`
              : isNew
                ? "Create new account"
                : "Edit account"}
          </h4>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close form"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE3F2] bg-white text-slate-500 transition-colors hover:text-qc-navy"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Validation */}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-qc-red"
        >
          {error}
        </p>
      )}

      {/* Account information */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="block text-xs font-bold text-qc-navy">
          Full name

          <input
            className={inputClass}
            value={draft.fullName}
            onChange={(event) =>
              onChange({
                ...draft,
                fullName: event.target.value,
              })
            }
            placeholder="Dr. Maria Santos"
            required
            maxLength={80}
          />
        </label>

        <label className="block text-xs font-bold text-qc-navy">
          Username

          <input
            className={`${inputClass} font-mono`}
            value={draft.username}
            onChange={(event) =>
              onChange({
                ...draft,
                username: event.target.value.toLowerCase(),
              })
            }
            placeholder="msantos"
            autoCapitalize="none"
            spellCheck={false}
            required
            pattern="[a-z0-9._\-]{3,32}"
            title="3–32 lowercase letters, numbers, dots, dashes or underscores"
          />
        </label>

        <label className="block text-xs font-bold text-qc-navy">
          Role

          <select
            className={inputClass}
            value={draft.role}
            onChange={(event) =>
              onChange({
                ...draft,
                role: event.target.value as UserRole,
              })
            }
            disabled={isSelf}
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>

          {isSelf && (
            <span className="mt-1 block text-[11px] font-medium text-slate-500">
              Your own role cannot be changed here.
            </span>
          )}
        </label>
      </div>

      {/* Modality assignment */}
      <fieldset className="mt-5 border-t border-[#E4E8F1] pt-4">
        <legend className="text-sm font-extrabold text-qc-navy">
          Assigned modalities
        </legend>

        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          The first selected modality becomes the default
          dashboard view. Leave empty to show all modalities.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {MODALITY_ORDER.map((code) => {
            const position =
              draft.assignedModalities.indexOf(code);

            const isOn = position >= 0;

            return (
              <button
                key={code}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleModality(code)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
                  isOn
                    ? "border-qc-navy bg-qc-navy text-white"
                    : "border-[#DDE3F2] bg-white text-slate-600 hover:border-qc-blue/30 hover:text-qc-blue"
                }`}
              >
                {isOn && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-qc-yellow text-[11px] font-black text-qc-navy">
                    {position + 1}
                  </span>
                )}

                {modalityName(code)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Form actions */}
      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#E4E8F1] pt-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#DDE3F2] bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:text-qc-navy"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-qc-navy px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-qc-blue disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="h-4 w-4 text-qc-yellow" />

          {isPending
            ? "Saving..."
            : isNew
              ? "Create account"
              : "Save changes"}
        </button>

        {isNew && (
          <span className="text-xs leading-relaxed text-slate-500 sm:ml-auto">
            A temporary password will be shown after creation.
          </span>
        )}
      </div>
    </form>
  );
}

/* =========================================================
   TEMPORARY PASSWORD
========================================================= */

interface TemporaryPasswordCardProps {
  username: string;
  password: string;
  onDismiss: () => void;
}

function TemporaryPasswordCard({
  username,
  password,
  onDismiss,
}: TemporaryPasswordCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-200 bg-[#FFFBEB] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-extrabold text-amber-900">
          Temporary password
        </h4>

        <p className="text-xs leading-relaxed text-amber-900/75">
          For <strong>{username}</strong>. Share this password
          privately. It will only be shown once, and the staff
          member must change it on their first sign-in.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 rounded-xl border border-amber-200 bg-white px-4 py-2.5 font-mono text-base font-bold tracking-wider text-qc-navy">
          {password}
        </code>

        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3.5 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100"
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}

          {isCopied ? "Copied" : "Copy password"}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="h-10 rounded-xl px-3 text-xs font-bold text-amber-900/70 transition-colors hover:bg-amber-100 hover:text-amber-900"
        >
          Done
        </button>
      </div>
    </div>
  );
}