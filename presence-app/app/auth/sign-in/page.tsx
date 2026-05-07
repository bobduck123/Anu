import { Suspense } from "react";
import { SignInForm } from "@/components/auth/PresenceAuthForms";

export const metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
