import { signInAction } from './actions';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params.error ? decodeURIComponent(params.error) : null;

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-primary-700 flex items-center justify-center shrink-0">
            <span className="text-white font-display font-bold text-base">H</span>
          </div>
          <div>
            <div className="font-display font-bold text-ink-900 text-xl leading-none tracking-tight">
              HomeBase
            </div>
            <div className="text-[11px] text-ink-400 mt-0.5 italic">Admin Dashboard</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-lg border border-border px-8 py-8">
          <h1 className="font-display font-semibold text-ink-900 text-lg mb-1">Sign in</h1>
          <p className="text-sm text-ink-500 mb-6">
            Sign in with your HomeBase admin credentials. If you don&apos;t have access, contact{' '}
            <a href="mailto:ayman@scout-ai.co" className="text-primary-600 hover:underline">
              ayman@scout-ai.co
            </a>
            .
          </p>

          <form action={signInAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="ops@homebase.app"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-ink-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-error-light border border-error/20 px-3.5 py-2.5 text-sm text-error">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-primary-700 hover:bg-primary-600 text-white font-display font-semibold text-sm py-2.5 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-ink-400 mt-6">
          &copy; HomeBase Marketplace MVP
        </p>
      </div>
    </div>
  );
}
