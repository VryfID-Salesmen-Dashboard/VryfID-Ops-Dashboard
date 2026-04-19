import { redirect } from "next/navigation";
import { Sidebar, REP_NAV } from "@/components/nav/sidebar";
import { Header } from "@/components/nav/header";
import { getCurrentRole } from "@/lib/auth/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  if (!role) redirect("/sign-in");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50">
      <Sidebar items={REP_NAV} roleLabel="Sales rep" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title="My dashboard" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
