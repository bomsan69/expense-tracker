import { PageHeader } from "@/components/app/page-header";

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Statistics" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">SCR-06 · Statistics</p>
      </div>
    </>
  );
}
