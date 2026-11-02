import { PageHeader } from "@/components/app/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">SCR-05 · Settings</p>
      </div>
    </>
  );
}
