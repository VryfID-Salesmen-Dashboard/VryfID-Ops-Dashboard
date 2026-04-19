import { UserButton } from "@clerk/nextjs";

export function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 pl-14 md:px-6">
      <div>
        <h1 className="text-lg font-semibold text-brand-charcoal">{title}</h1>
        {subtitle ? (
          <p className="text-xs text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      <UserButton
        appearance={{
          elements: { avatarBox: "h-8 w-8" },
        }}
      />
    </header>
  );
}
