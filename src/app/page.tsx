import { redirect } from "next/navigation";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";

export default async function Home() {
  const session = await getCurrentSession();
  redirect(session ? "/inventory" : "/login");
}
