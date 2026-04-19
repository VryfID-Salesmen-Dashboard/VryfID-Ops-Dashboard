import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-brand-charcoal">VryfID Ops</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to continue</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary:
                "bg-brand-green hover:bg-brand-green-hover text-white",
            },
          }}
        />
      </div>
    </main>
  );
}
