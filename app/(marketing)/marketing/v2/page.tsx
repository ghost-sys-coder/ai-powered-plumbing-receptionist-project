import { redirect } from "next/navigation";

// The landing page used to live here; it's now the home page.
export default function OldLandingPage() {
  redirect("/");
}
