import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/staff/common";
import { ProductForm } from "@/components/staff/ProductForm";

export const metadata = { title: "Add product" };

export default async function NewProduct() {
  await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return (
    <>
      <PageHeader title="Add product" subtitle="It goes live on the customer website as soon as you save." />
      <ProductForm />
    </>
  );
}
