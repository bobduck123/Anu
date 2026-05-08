import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/PresenceAuthForms";

export const metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
