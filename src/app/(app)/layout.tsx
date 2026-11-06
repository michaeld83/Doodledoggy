import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Nav, MobileTabBar } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen overflow-x-clip">
      <Header user={session} />
      <Nav />
      {/* Extra bottom padding on phones so content clears the bottom tab bar */}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:py-6 md:pb-6">{children}</main>
      <MobileTabBar userName={session.name} />
    </div>
  );
}
