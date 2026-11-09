"use client";

import { useActionState, useId, useState, type InputHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { changePasswordAction, loginAction, type AuthFormState } from "@/app/actions/auth";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

function Field({ label, hint, type, ...props }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const isPassword = type === "password";
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-qc-navy">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={isPassword && isVisible ? "text" : type}
          aria-describedby={hint ? hintId : undefined}
          className="h-12 w-full rounded-xl border border-border bg-white px-4 text-[15px] text-qc-navy shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-qc-blue focus:ring-4 focus:ring-qc-blue/10"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsVisible((value) => !value)}
            aria-label={isVisible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-1.5 my-1.5 flex w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40"
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-qc-red/20 bg-red-50 px-3.5 py-3 text-sm font-semibold text-qc-red"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

function SubmitButton({ isPending, label, pendingLabel }: { isPending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-qc-navy text-[15px] font-extrabold text-white shadow-[0_8px_20px_rgba(5,6,64,0.18)] transition-[background-color,transform] hover:bg-qc-blue active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-qc-yellow/60"
    >
      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      {isPending ? pendingLabel : label}
    </button>
  );
}

const INITIAL_STATE: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, INITIAL_STATE);

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
        required
        defaultValue={state.username}
        autoFocus
      />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton isPending={isPending} label="Sign in" pendingLabel="Signing in…" />
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Forgot your password? Ask the RADiTrack administrator to reset it.
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

export function ChangePasswordForm({ username, showUsername = true }: ChangePasswordFormProps) {
  const [state, formAction, isPending] = useActionState(changePasswordAction, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />
      {state.success && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {state.success}
        </p>
      )}
      {/* Hidden but read by password managers, so they fill and save the right account. */}
      <input type="text" name="username" value={username} autoComplete="username" readOnly hidden />
      {showUsername && (
        <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground">
          Signed in as <strong className="font-mono text-qc-navy">{username}</strong>
        </p>
      )}
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        hint="The temporary password you were given, or your old password."
        required
      />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        required
        minLength={8}
      />
      <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required />
      <SubmitButton isPending={isPending} label="Save password" pendingLabel="Saving…" />
    </form>
  );
}
