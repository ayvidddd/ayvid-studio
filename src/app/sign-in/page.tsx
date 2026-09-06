import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Sign in to Ayvid Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="underline underline-offset-4">
            Create one
          </Link>
        </p>
      </div>
      <SignInForm callbackUrl={callbackUrl ?? "/brand-kit"} />
    </main>
  );
}
