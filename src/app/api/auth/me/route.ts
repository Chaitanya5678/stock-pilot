import { NextResponse } from "next/server";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";

export async function GET() {
  const session = await getCurrentSession();
  return NextResponse.json({ user: session });
}
