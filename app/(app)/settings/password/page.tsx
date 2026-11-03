import { PageHeader } from "@/components/app/page-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader title="Change Password" showBack />
      <div className="flex-1 px-4 py-6">
        <ChangePasswordForm />
      </div>
    </>
  );
}
