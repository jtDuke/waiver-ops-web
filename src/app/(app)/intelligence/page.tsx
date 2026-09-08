import { redirect } from "next/navigation";

export const metadata = { title: "Intelligence" };

export default function IntelligencePage() {
  redirect("/leagues");
}
