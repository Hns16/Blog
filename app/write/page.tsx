import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Write",
  description: "Create a blog post"
};

export default function WritePage() {
  const authed = isAdminAuthenticated(cookies());
  redirect(authed ? "/admin/new" : "/admin");
}
