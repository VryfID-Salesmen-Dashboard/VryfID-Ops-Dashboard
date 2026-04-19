import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/auth/roles";

export default async function RootPage() {
  const role = await getCurrentRole();
  if (role === "admin") redirect("/admin");
  if (role === "sales_rep") redirect("/dashboard");
  redirect("/sign-in");
}
