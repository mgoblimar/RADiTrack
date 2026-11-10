"use client";

import {
  useActionState,
  useId,
  useState,
  type InputHTMLAttributes,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import {
  changePasswordAction,
  loginAction,
  type AuthFormState,
} from "@/app/actions/auth";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

function Field({
  label,
  hint,
  type,
  ...props
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  const isPassword = type === "password";
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-sm font-bold text-qc-navy"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <input
          id={id}
          type={isPassword && isVisible ? "text" : type}
          aria-describedby={hint ? hintId : undefined}
          className="h-[50px] w-full rounded-xl border border-[#DDE3F2] bg-[#FBFCFE] px-4 text-[15px] font-medium text-qc-navy shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-qc-blue/30 focus:border-qc-blue focus:bg-white focus:ring-4 focus:ring-qc-blue/10 disabled:cursor-not-allowed disabled:bg-slate-100"
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() =>
              setIsVisible((value) => !value)
            }
            aria-label={
              isVisible ? "Hide password" : "Show password"
            }
            aria-pressed={isVisible}
            className="absolute inset-y-0 right-1.5 my-1.5 flex w-10 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-qc-yellow/15 hover:text-qc-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow"
          >
            {isVisible ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        )}
      </div>

      {hint && (
        <p
          id={hintId}
          className="mt-1.5 text-xs leading-relaxed text-slate-500"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function FormError({
  message,
}: {
  message?: string;
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-qc-red/20 border-l-[3px] border-l-qc-red bg-[#FFF5F5] px-3.5 py-3 text-sm font-semibold leading-relaxed text-qc-red"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({
  isPending,
  label,
  pendingLabel,
}: {
  isPending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-qc-navy text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(0,53,122,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-qc-blue hover:shadow-[0_9px_20px_rgba(0,53,122,0.20)] active:translate-y-0 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-qc-yellow/60"
    >
      {isPending && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}

      <span>
        {isPending ? pendingLabel : label}
      </span>
    </button>
  );
}

const INITIAL_STATE: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] =
    useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />

      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Enter your username"
        required
        defaultValue={state.username}
        autoFocus
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        required
      />

      <div className="pt-1">
        <SubmitButton
          isPending={isPending}
          label="Sign in"
          pendingLabel="Signing in..."
        />
      </div>

      <p className="border-t border-[#EEF1F6] pt-4 text-center text-xs leading-relaxed text-slate-500">
        Forgot your password? Ask the RADiTrack administrator
        to reset it.
      </p>
    </form>
  );
}

/** username: tells the browser which saved account these passwords belong to. */
interface ChangePasswordFormProps {
  username: string;
  /** Hides the "Signed in as" line when the page already shows the account. */
  showUsername?: boolean;
}

export function ChangePasswordForm({
  username,
  showUsername = true,
}: ChangePasswordFormProps) {
  const [state, formAction, isPending] =
    useActionState(changePasswordAction, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />

      {state.success && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-qc-blue/15 border-l-[3px] border-l-qc-blue bg-qc-blue/[0.05] px-3.5 py-3 text-sm font-semibold leading-relaxed text-qc-blue"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <input
        type="text"
        name="username"
        value={username}
        autoComplete="username"
        readOnly
        hidden
      />

      {showUsername && (
        <div className="rounded-xl border border-[#E4E8F1] bg-[#F8FAFD] px-3.5 py-3">
          <p className="text-xs font-semibold text-slate-500">
            Signed in as
          </p>

          <p className="mt-1 font-mono text-sm font-bold text-qc-navy">
            {username}
          </p>
        </div>
      )}

      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your current password"
        hint="Enter the temporary password provided by your administrator, or your existing password."
        required
      />

      <Field
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Enter your new password"
        hint="Use at least 8 characters, including a letter and a number."
        required
        minLength={8}
      />

      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your new password"
        required
      />

      <div className="pt-1">
        <SubmitButton
          isPending={isPending}
          label="Save password"
          pendingLabel="Saving..."
        />
      </div>
    </form>
  );
}