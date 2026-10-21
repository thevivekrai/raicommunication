import { requirePageRole } from "@/lib/auth";
import { BookingDetail } from "@/components/staff/BookingDetail";

export const metadata = { title: "Booking" };

export default async function BookingPage({ params }: { params: { id: string } }) {
  const user = await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return <BookingDetail id={params.id} isAdmin={user.role === "ADMIN"} />;
}
