import { notFound } from "next/navigation";
import { getDesign } from "@/lib/studio/actions";
import { StudioWorkspace } from "@/components/studio/studio-workspace";

export default async function StudioDesignPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;
  const result = await getDesign(designId);

  if (!result.ok) notFound();

  return (
    <StudioWorkspace designId={designId} designName={result.data.name} initialCanvas={result.data.canvas} />
  );
}
