import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/staff/common";
import { BookingsList } from "@/components/staff/BookingsList";

export const metadata = { title: "All bookings" };

export default async function BookingsPage() {
  await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return (
    <>
      <PageHeader title="All bookings" subtitle="What each customer booked, who is delivering it and how it ended." />
      <BookingsList />
    </>
  );
}
