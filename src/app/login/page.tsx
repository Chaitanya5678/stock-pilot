import { redirect } from "next/navigation";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/inventory");
  }

  return (
    <main className="auth-page">
      <section className="auth-card glass">
        <p className="eyebrow">StockPilot</p>
        <h1>Sign in</h1>
        <p className="subtle">MRO inventory management</p>
        <LoginForm />
      </section>
    </main>
  );
}
