import { requirePageRole } from "@/lib/auth";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "My deliveries", template: "%s · Delivery" } };

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["DELIVERY"]);
  return <DeliveryShell name={user.name}>{children}</DeliveryShell>;
}
