import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/PresenceAuthForms";

export const metadata = {
  title: "Choose a new password",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
