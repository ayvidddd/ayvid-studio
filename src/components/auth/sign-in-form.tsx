"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCredentialsSignIn(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl });
      if (result?.error) {
        toast.error("That email and password don't match an account.");
        return;
      }
      window.location.href = result?.url ?? callbackUrl;
    });
  }

  function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await signIn("nodemailer", { email, redirect: false, callbackUrl });
      if (result?.error) {
        toast.error("Couldn't send the sign-in link. Please try again.");
        return;
      }
      setMagicLinkSent(true);
    });
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        or
        <Separator className="flex-1" />
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleCredentialsSignIn}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Sign in
        </Button>
      </form>

      {magicLinkSent ? (
        <p className="text-center text-sm text-muted-foreground">
          Check {email} for a sign-in link.
        </p>
      ) : (
        <button
          type="button"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          disabled={isPending || !email}
          onClick={handleMagicLink}
        >
          Or send me a magic link instead
        </button>
      )}
    </div>
  );
}
