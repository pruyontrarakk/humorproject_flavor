import { PromptChainTool } from "@/components/PromptChainTool";

export default function LandingPage() {
  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-brand-800 dark:text-brand-200">
          Prompt chain tool
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">humor_flavors</code>,{" "}
          <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">humor_flavor_steps</code>, and{" "}
          <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">humor_flavor_step_types</code>. Test caption
          generation via{" "}
          <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">/api/generate-captions</code> (set{" "}
          <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">CAPTION_API_URL</code> in{" "}
          <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">.env.local</code>).
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Sign-in: <code className="text-slate-700 dark:text-slate-300">profiles.is_superadmin</code> or{" "}
          <code className="text-slate-700 dark:text-slate-300">profiles.is_matrix_admin</code>.
        </p>
      </section>
      <PromptChainTool />
    </div>
  );
}
