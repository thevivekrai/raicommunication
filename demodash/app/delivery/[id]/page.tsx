import { AssignmentDetail } from "@/components/delivery/AssignmentDetail";

export const metadata = { title: "Delivery" };

export default function AssignmentPage({ params }: { params: { id: string } }) {
  return <AssignmentDetail id={params.id} />;
}
