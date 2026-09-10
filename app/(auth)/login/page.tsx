import { redirect } from "next/navigation";

/** Pitch: skip OTP and go straight into the demo dashboard. */
export default function LoginPage() {
  redirect("/api/auth/demo-skip");
}
