import { BottomNav } from "@/components/app/bottom-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
