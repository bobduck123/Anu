import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/PresenceAuthForms";

export const metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
