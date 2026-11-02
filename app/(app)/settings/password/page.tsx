import { PageHeader } from "@/components/app/page-header";

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader title="Change Password" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          SUP-03 · Change Password
        </p>
      </div>
    </>
  );
}
