import Link from "next/link";
import { PromptChainTool } from "@/components/PromptChainTool";

type Props = { params: { flavorId: string } };

export default async function FlavorDetailPage({ params }: Props) {
  const { flavorId } = params;
  if (!flavorId?.trim()) {
    return (
      <div className="card p-5">
        <p className="text-sm text-slate-600 dark:text-slate-400">Missing flavor id.</p>
        <Link href="/" className="mt-3 inline-block text-sm font-medium text-brand-800 underline dark:text-brand-300">
          ← Back to flavors
        </Link>
      </div>
    );
  }

  return <PromptChainTool flavorId={flavorId.trim()} />;
}
