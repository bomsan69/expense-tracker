import { PageHeader } from "@/components/app/page-header";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { LogoutButton } from "@/components/settings/logout-button";
import { SettingsRow } from "@/components/settings/settings-row";
import { requireSession } from "@/lib/auth/session";
import { getUserAiSettings } from "@/lib/queries/settings";

export default async function SettingsPage() {
  const session = await requireSession();
  const settings = await getUserAiSettings(session.userId);
  const maskedKey = settings?.aiApiKeyLast4
    ? `••••••••${settings.aiApiKeyLast4}`
    : null;

  return (
    <>
      <PageHeader title="Settings" showBack />
      <div className="flex-1 px-4 py-6">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
          ACCOUNT
        </h2>
        <SettingsRow label="Change Password" href="/settings/password" />

        <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted-foreground">
          CATEGORIES
        </h2>
        <SettingsRow label="Manage Categories" href="/settings/categories" />

        <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted-foreground">
          AI CONFIGURATION
        </h2>
        <div className="mt-3">
          <AiSettingsForm
            initialModel={settings?.aiModel ?? ""}
            maskedKey={maskedKey}
          />
        </div>

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
