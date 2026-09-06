import Link from "next/link";
import { listDesigns } from "@/lib/studio/actions";
import { NewDesignButton } from "@/components/studio/new-design-button";
import { Card } from "@/components/ui/card";

export default async function StudioIndexPage() {
  const result = await listDesigns();
  const designs = result.ok ? result.data : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Studio</h1>
        <NewDesignButton />
      </div>

      {!result.ok && <p className="text-sm text-destructive">{result.error}</p>}

      {result.ok && designs.length === 0 && (
        <p className="text-sm text-muted-foreground">No designs yet — create your first one above.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {designs.map((design) => (
          <Link key={design.id} href={`/studio/${design.id}`}>
            <Card className="p-4 transition-colors hover:bg-muted">
              <p className="truncate text-sm font-medium">{design.name}</p>
              <p className="text-xs text-muted-foreground">
                Updated {design.updatedAt.toLocaleDateString()}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
