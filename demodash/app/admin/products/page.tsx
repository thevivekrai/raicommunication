import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/staff/common";
import { ProductsAdmin } from "@/components/staff/ProductsAdmin";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const user = await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return (
    <>
      <PageHeader title="Products" subtitle="Changes appear on the customer site immediately." actions={<Link href="/admin/products/new" className="btn-primary">+ Add product</Link>} />
      <ProductsAdmin isAdmin={user.role === "ADMIN"} />
    </>
  );
}
