import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/staff/common";
import { ProductForm } from "@/components/staff/ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: { id: string } }) {
  await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return (
    <>
      <PageHeader title="Edit product" />
      <ProductForm productId={params.id} />
    </>
  );
}
