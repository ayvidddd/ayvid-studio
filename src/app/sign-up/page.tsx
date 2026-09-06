import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { ParticleBackground } from "@/components/marketing/particle-background";

export default function SignUpPage() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <ParticleBackground />
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Create your Ayvid Studio account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}
