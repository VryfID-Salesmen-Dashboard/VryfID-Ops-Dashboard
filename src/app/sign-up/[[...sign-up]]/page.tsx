import Link from "next/link";

export default function SignUpDisabledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-charcoal">
          Self sign-up is disabled
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          VryfID Ops accounts are provisioned by an administrator. If you&rsquo;re
          expecting an invitation, check your email for a sign-in link.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-hover"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
