"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { MODALITY_CONFIG, MODALITY_ORDER } from "@/lib/enums";

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

const ROLE_GROUPS: ReadonlyArray<{ role: UserRole; title: string; empty: string }> = [
  { role: "RADIOLOGIST", title: "Radiologists", empty: "No radiologists yet." },
  { role: "RESIDENT", title: "Residents", empty: "No residents yet." },
  { role: "ADMIN", title: "Administrators", empty: "No administrators." },
];

function modalityName(code: string): string {
  return MODALITY_CONFIG[code as keyof typeof MODALITY_CONFIG]?.shortName ?? code;
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

/** Administrator page for creating doctors' accounts and assigning modalities. */
export function AccountsPanel({ currentUserId }: AccountsPanelProps) {
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ userId: string | null; draft: DraftAccount } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<{ username: string; password: string } | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        setAccounts(await listAccountsAction());
        setLoadError(null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load accounts.");
      }
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleResult = (result: AccountResult, username: string, successText: string) => {
    if (!result.success) {
      setNotice({ text: result.error, tone: "error" });
      return false;
    }
    if (result.temporaryPassword) {
      setIssuedPassword({ username, password: result.temporaryPassword });
    }
    setNotice({ text: successText, tone: "ok" });
    refresh();
    return true;
  };

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
        userId ? `Saved ${draft.fullName}.` : `Created an account for ${draft.fullName}.`,
      );
    });
  };

  const resetPassword = (account: AccountSummary) => {
    if (!confirm(`Reset ${account.fullName}'s password? They will be signed out and must set a new one.`)) return;
    startTransition(async () => {
      handleResult(
        await resetAccountPasswordAction(account.userId),
        account.username,
        `Reset ${account.fullName}'s password.`,
      );
    });
  };

  const toggleActive = (account: AccountSummary) => {
    const next = !account.isActive;
    if (!next && !confirm(`Deactivate ${account.fullName}? They will be signed out and can't sign in.`)) return;
    startTransition(async () => {
      handleResult(
        await setAccountActiveAction(account.userId, next),
        account.username,
        `${account.fullName} is now ${next ? "active" : "deactivated"}.`,
      );
    });
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/[0.78] shadow-[0_16px_45px_rgba(5,14,64,0.07)] backdrop-blur-xl">
      <header className="flex flex-col gap-3 border-b border-white/70 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">Sign-in accounts</p>
          <h3 className="mt-1 text-lg font-extrabold text-qc-navy">RADIOLOGISTS, RESIDENTS & ADMINISTRATORS</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Each doctor&apos;s first modality is where their dashboard and backlog start. Accounts only set the
            starting view; RADiTrack does not rank or score individual doctors.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setEditing({ userId: null, draft: EMPTY_DRAFT });
          }}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-qc-navy px-4 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(5,14,64,0.18)] transition-colors hover:bg-qc-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow"
        >
          <Plus className="h-4 w-4 text-qc-yellow" />
          Add account
        </button>
      </header>

      <div className="space-y-4 p-4 sm:p-6">
        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              notice.tone === "ok"
                ? "border-qc-blue/15 bg-qc-blue/[0.06] text-qc-blue"
                : "border-red-200 bg-red-50 text-qc-red"
            }`}
          >
            {notice.tone === "ok" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {notice.text}
          </p>
        )}

        {issuedPassword && (
          <TemporaryPasswordCard
            username={issuedPassword.username}
            password={issuedPassword.password}
            onDismiss={() => setIssuedPassword(null)}
          />
        )}

        {/* New account: form at the top */}
        {editing && editing.userId === null && (
          <AccountForm
            draft={editing.draft}
            isNew
            isSelf={false}
            error={formError}
            isPending={isPending}
            onChange={(draft) => setEditing({ ...editing, draft })}
            onCancel={() => setEditing(null)}
            onSave={saveDraft}
          />
        )}

        {loadError && (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-qc-red">
            {loadError}
          </p>
        )}

        {accounts === null && !loadError ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading accounts…</p>
        ) : accounts && accounts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <UsersRound className="h-8 w-8 text-qc-blue" />
            <p className="mt-3 text-sm font-extrabold text-qc-navy">No accounts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add one for each radiologist and resident.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {ROLE_GROUPS.map((group) => {
              const members = (accounts ?? []).filter((account) => account.role === group.role);
              return (
                <section key={group.role} aria-labelledby={`group-${group.role}`}>
                  <h4
                    id={`group-${group.role}`}
                    className="mb-2 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-[0.12em] text-qc-navy"
                  >
                    {group.title}
                    <span className="rounded-full bg-qc-blue/10 px-2 py-0.5 text-[11px] tracking-normal text-qc-blue">
                      {members.length}
                    </span>
                  </h4>

                  {members.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border bg-white/60 px-4 py-4 text-xs text-muted-foreground">
                      {group.empty}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
                      {members.map((account) => {
                        const isEditingThis = editing?.userId === account.userId;
                        return (
                          <li key={account.userId}>
                            <AccountRow
                              account={account}
                              isSelf={account.userId === currentUserId}
                              isEditing={isEditingThis}
                              isPending={isPending}
                              onEdit={() => {
                                setFormError(null);
                                setEditing({
                                  userId: account.userId,
                                  draft: {
                                    fullName: account.fullName,
                                    username: account.username,
                                    role: account.role,
                                    assignedModalities: account.assignedModalities,
                                  },
                                });
                              }}
                              onResetPassword={() => resetPassword(account)}
                              onToggleActive={() => toggleActive(account)}
                            />
                            {isEditingThis && editing && (
                              <AccountForm
                                draft={editing.draft}
                                isNew={false}
                                editingLabel={`${account.fullName} (${account.username})`}
                                isSelf={account.userId === currentUserId}
                                error={formError}
                                isPending={isPending}
                                onChange={(draft) => setEditing({ ...editing, draft })}
                                onCancel={() => setEditing(null)}
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

interface AccountRowProps {
  account: AccountSummary;
  isSelf: boolean;
  /** The row whose details are open in the form right below it. */
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
      className={`relative flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:gap-6 ${
        isEditing ? "bg-qc-yellow/15" : account.isActive ? "" : "bg-slate-50 opacity-70"
      }`}
    >
      {isEditing && <span className="absolute inset-y-0 left-0 w-1 bg-qc-yellow" aria-hidden />}

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-qc-navy">
          {account.fullName}
          {isEditing && (
            <Badge tone="navy">
              <Pencil className="h-3 w-3" /> Editing
            </Badge>
          )}
          {isSelf && <Badge tone="blue">You</Badge>}
          {!account.isActive && <Badge tone="slate">Deactivated</Badge>}
          {account.isActive && account.mustChangePassword && <Badge tone="amber">Must set password</Badge>}
          {account.isLocked && (
            <Badge tone="red">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono">{account.username}</span> · Last sign-in {formatLastLogin(account.lastLoginAt)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 lg:w-60">
        {account.assignedModalities.length === 0 ? (
          <span className="text-xs text-muted-foreground">All modalities</span>
        ) : (
          account.assignedModalities.map((code, index) => (
            <span
              key={code}
              className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                index === 0 ? "bg-qc-navy text-white" : "bg-qc-blue/10 text-qc-blue"
              }`}
              title={index === 0 ? "Default view" : undefined}
            >
              {modalityName(code)}
            </span>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {!isEditing && (
          <RowButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" disabled={isPending} onClick={onEdit} />
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
              label={account.isActive ? "Deactivate" : "Activate"}
              tone={account.isActive ? "danger" : "default"}
              disabled={isPending}
              onClick={onToggleActive}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "navy" | "blue" | "slate" | "amber" | "red"; children: React.ReactNode }) {
  const tones = {
    navy: "bg-qc-navy text-white",
    blue: "bg-qc-blue/10 text-qc-blue",
    slate: "bg-slate-200 text-slate-600",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-qc-red",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tones[tone]}`}>
      {children}
    </span>
  );
}

interface RowButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

function RowButton({ icon, label, onClick, disabled, tone = "default" }: RowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
        tone === "danger"
          ? "border-red-200 bg-red-50/60 text-qc-red hover:bg-red-50"
          : "border-slate-200 bg-white text-qc-navy hover:border-qc-blue/30 hover:text-qc-blue"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface AccountFormProps {
  draft: DraftAccount;
  isNew: boolean;
  /** "Dr. Maria Santos (msantos)": names the account being changed. */
  editingLabel?: string;
  isSelf: boolean;
  error: string | null;
  isPending: boolean;
  onChange: (draft: DraftAccount) => void;
  onCancel: () => void;
  onSave: () => void;
}

function AccountForm({ draft, isNew, editingLabel, isSelf, error, isPending, onChange, onCancel, onSave }: AccountFormProps) {
  const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-qc-navy outline-none focus:border-qc-blue/40 focus:ring-2 focus:ring-qc-blue/10";

  // Click order is kept: the first modality picked becomes the default view.
  const toggleModality = (code: string) => {
    const has = draft.assignedModalities.includes(code);
    onChange({
      ...draft,
      assignedModalities: has
        ? draft.assignedModalities.filter((c) => c !== code)
        : [...draft.assignedModalities, code],
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      aria-label={editingLabel ? `Edit ${editingLabel}` : "New account"}
      className={
        editingLabel
          ? "relative border-t border-qc-yellow/40 bg-qc-yellow/[0.07] p-4 pl-5 sm:p-5 sm:pl-6"
          : "rounded-2xl border border-qc-blue/15 bg-qc-blue/[0.03] p-4 sm:p-5"
      }
    >
      {editingLabel && <span className="absolute inset-y-0 left-0 w-1 bg-qc-yellow" aria-hidden />}
      <div className="flex items-center justify-between gap-3">
        {editingLabel ? (
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Editing account
            </p>
            <h4 className="text-base font-extrabold text-qc-navy">{editingLabel}</h4>
          </div>
        ) : (
          <h4 className="text-sm font-extrabold uppercase tracking-[0.1em] text-qc-navy">
            {isNew ? "New account" : "Edit account"}
          </h4>
        )}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-qc-navy"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-qc-red">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-xs font-bold text-qc-navy">
          Full name
          <input
            className={`${inputClass} mt-1.5`}
            value={draft.fullName}
            onChange={(e) => onChange({ ...draft, fullName: e.target.value })}
            placeholder="Dr. Maria Santos"
            required
            maxLength={80}
          />
        </label>
        <label className="block text-xs font-bold text-qc-navy">
          Username
          <input
            className={`${inputClass} mt-1.5 font-mono`}
            value={draft.username}
            onChange={(e) => onChange({ ...draft, username: e.target.value.toLowerCase() })}
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
            className={`${inputClass} mt-1.5`}
            value={draft.role}
            onChange={(e) => onChange({ ...draft, role: e.target.value as UserRole })}
            disabled={isSelf}
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold text-qc-navy">Assigned modalities</legend>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick in order of priority: the first one is where the dashboard starts. Leave empty to start on all
          modalities.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODALITY_ORDER.map((code) => {
            const position = draft.assignedModalities.indexOf(code);
            const isOn = position >= 0;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleModality(code)}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
                  isOn
                    ? "border-qc-navy bg-qc-navy text-white"
                    : "border-slate-200 bg-white text-qc-navy hover:border-qc-blue/30"
                }`}
              >
                {isOn && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-qc-yellow text-[11px] text-qc-navy">
                    {position + 1}
                  </span>
                )}
                {modalityName(code)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-qc-navy px-5 text-sm font-extrabold text-white hover:bg-qc-blue disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {isNew ? "Create account" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-xl px-4 text-sm font-bold text-muted-foreground hover:bg-white hover:text-qc-navy"
        >
          Cancel
        </button>
        {isNew && (
          <span className="text-xs text-muted-foreground">A temporary password is shown once after saving.</span>
        )}
      </div>
    </form>
  );
}

interface TemporaryPasswordCardProps {
  username: string;
  password: string;
  onDismiss: () => void;
}

function TemporaryPasswordCard({ username, password, onDismiss }: TemporaryPasswordCardProps) {
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
    <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-extrabold text-amber-900">Temporary password for {username}</p>
      <p className="mt-1 text-xs text-amber-900/80">
        Give it to the doctor privately. It is shown only once; they must replace it when they first sign in.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-xl border border-amber-300 bg-white px-4 py-2 font-mono text-lg font-bold tracking-wider text-qc-navy">
          {password}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 hover:bg-amber-100"
        >
          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {isCopied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="h-10 rounded-xl px-3 text-xs font-bold text-amber-900/70 hover:text-amber-900"
        >
          Done
        </button>
      </div>
    </div>
  );
}
