import { redirect } from "next/navigation";

/** Pitch: skip signup and go straight into the demo dashboard. */
export default function RegisterPage() {
  redirect("/api/auth/demo-skip");
}
