import { redirect } from "next/navigation";
import { Sidebar, ADMIN_NAV } from "@/components/nav/sidebar";
import { Header } from "@/components/nav/header";
import { getCurrentRole } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/dashboard");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50">
      <Sidebar items={ADMIN_NAV} roleLabel="Admin" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title="Admin" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
