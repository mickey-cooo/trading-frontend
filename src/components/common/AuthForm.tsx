"use client";

import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import Typography from "@mui/material/Typography";
import { yupResolver } from "@hookform/resolvers/yup";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Logo } from "@/components/common/Logo";
import { safeNext } from "@/lib/auth/redirect";
import { getErrorMessage } from "@/lib/axios/client";
import { useIsAuthed, useSessionCookieSync } from "@/lib/auth/session";
import { login, register } from "@/services/auth.service";

// label sits above the input: a floating label squeezes into the border when focused
function Field({ label, helperText, error, ...input }: { label: string; helperText?: string; error?: boolean } & ComponentProps<typeof OutlinedInput>) {
  const id = useId();
  return (
    <FormControl fullWidth error={error} required={input.required}>
      <InputLabel shrink={false} htmlFor={id} sx={{ position: "static", transform: "none", mb: 0.75, fontWeight: 600, color: "text.primary", "&.Mui-focused": { color: "text.primary" } }}>
        {label}
      </InputLabel>
      <OutlinedInput id={id} size="small" {...input} />
      {helperText && <FormHelperText sx={{ mx: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
}

type Mode = "login" | "register";
type Values = { email: string; password: string; confirm: string };

const IDLE_MS = 500; // validate once the user stops typing

const schema = (mode: Mode): yup.ObjectSchema<Values> =>
  yup.object({
    email: yup.string().trim().required("Email is required").email("Enter a valid email").max(254),
    password:
      mode === "register"
        ? yup.string().required("Password is required").min(8, "At least 8 characters").max(72, "At most 72 characters")
        : yup.string().required("Password is required").max(72),
    confirm:
      mode === "register"
        ? yup.string().required("Confirm your password").oneOf([yup.ref("password")], "Passwords do not match")
        : yup.string().default(""),
  });

export function AuthForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<Mode>("login");
  const { register: reg, handleSubmit, subscribe, trigger, getValues, setValue, clearErrors, formState: { errors } } = useForm<Values>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { email: "", password: "", confirm: "" },
    resolver: yupResolver(schema(mode)),
  });
  // onBlur covers leaving a field; this covers pausing inside one
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: ({ name }) => {
        if (!name) return;
        clearTimeout(timer);
        // an edited password also invalidates an already-typed confirmation
        timer = setTimeout(() => trigger(name === "password" && getValues("confirm") ? ["password", "confirm"] : (name as keyof Values)), IDLE_MS);
      },
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [subscribe, trigger, getValues]);
  // OutlinedInput's ref is its root div; RHF needs the <input>
  const field = (name: keyof Values) => {
    const { ref, ...rest } = reg(name);
    return { ...rest, inputRef: ref, error: !!errors[name] };
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // a visitor who is already signed in (or whose gate cookie lapsed) has nothing to do here
  useSessionCookieSync();
  const authed = useIsAuthed();
  useEffect(() => {
    if (authed) router.replace(next);
  }, [authed, next, router]);

  const submit = handleSubmit(async ({ email, password, confirm }) => {
    setBusy(true);
    setError(undefined);
    try {
      if (mode === "register") {
        await register(email, password, confirm);
        try {
          await login(email, password);
        } catch (err) {
          // the account exists now, so a retry on this tab would only say "email already exists"
          setMode("login");
          setValue("confirm", "");
          setError(`Account created, but signing in failed: ${getErrorMessage(err)}`);
          setBusy(false);
          return;
        }
      } else {
        await login(email, password);
      }
      router.replace(next); // stays busy until the navigation unmounts the form
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  });

  return (
    <Paper component="form" noValidate onSubmit={submit} sx={{ width: "100%", maxWidth: 420, p: { xs: 2.5, sm: 4 } }}>
      <Stack spacing={2.5} sx={{ "& .MuiOutlinedInput-root": { fontFamily: "var(--font-ui)", fontSize: "0.9375rem" }, "& .MuiInputLabel-root": { fontSize: "0.8125rem" } }}>
        {/* /trade is public; `next` may be a gated page that would bounce straight back here */}
        <Button component={Link} href="/trade" startIcon={<ArrowBackIosNew sx={{ fontSize: "0.875rem !important" }} />} sx={{ alignSelf: "flex-start", ml: -1 }}>
          Back to markets
        </Button>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Logo />
          <Typography variant="h2">ApexTrade</Typography>
        </Stack>
        <Tabs value={mode} onChange={(_, v) => { setMode(v); setValue("confirm", ""); clearErrors(); setError(undefined); }} variant="fullWidth">
          <Tab value="login" label="Log in" />
          <Tab value="register" label="Create account" />
        </Tabs>
        <Field label="Email" type="email" autoComplete="email" required {...field("email")} helperText={errors.email?.message} inputProps={{ maxLength: 254 }} />
        <Field
          label="Password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          {...field("password")}
          helperText={errors.password?.message ?? (mode === "register" ? "8 to 72 characters" : undefined)}
          inputProps={{ maxLength: 72 }}
        />
        {mode === "register" && (
          <Field
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            {...field("confirm")}
            helperText={errors.confirm?.message ?? " "}
            inputProps={{ maxLength: 72 }}
          />
        )}
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ minHeight: 48 }}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </Button>
      </Stack>
    </Paper>
  );
}
