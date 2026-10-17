import { redirect } from "next/navigation";
import { getSessionUser, homeForRole } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/ui";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { as?: string } }) {
  const user = await getSessionUser();
  if (user) redirect(homeForRole(user.role));
  const delivery = searchParams.as === "delivery";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <LoginForm delivery={delivery} />
    </main>
  );
}
