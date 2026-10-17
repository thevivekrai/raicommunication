import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/staff/common";
import { ProductAnalytics } from "@/components/staff/ProductAnalytics";

export const metadata = { title: "Demo analytics" };

export default async function AnalyticsPage() {
  await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return (
    <>
      <PageHeader title="Demo analytics" subtitle="How many demos each product got and how many turned into sales. Click a product to see every customer." />
      <ProductAnalytics />
    </>
  );
}
