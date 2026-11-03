import { PageHeader } from "@/components/app/page-header";
import { AddCategoryForm } from "@/components/settings/add-category-form";
import { CategoryRow } from "@/components/settings/category-row";
import { requireSession } from "@/lib/auth/session";
import { listCategories } from "@/lib/queries/categories";

export default async function ManageCategoriesPage() {
  const session = await requireSession();
  const categories = await listCategories(session.userId);

  return (
    <>
      <PageHeader title="Manage Categories" showBack />
      <div className="flex-1 px-4 py-6">
        <AddCategoryForm />

        <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted-foreground">
          EXISTING CATEGORIES
        </h2>
        <ul className="mt-2">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Editing a category keeps existing expense associations.
        </p>
      </div>
    </>
  );
}
