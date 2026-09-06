import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// This is a placeholder landing page. The full dark/glassy/particle marketing
// experience is built in Milestone 7 — this just gets M1 auth reachable.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Ayvid Studio</h1>
      <p className="max-w-md text-muted-foreground">
        Talk to an AI creative director that generates and edits your brand&apos;s ads and video
        creatives, live.
      </p>
      <div className="flex gap-3">
        <Link href="/sign-up" className={buttonVariants({ variant: "default" })}>
          Get started
        </Link>
        <Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </div>
    </main>
  );
}
