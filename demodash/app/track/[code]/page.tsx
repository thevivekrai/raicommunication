import { Header } from "@/components/customer/Header";
import { TrackView } from "@/components/customer/TrackView";

export const metadata = { title: "Track demo" };

export default function TrackBooking({ params }: { params: { code: string } }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 pb-16 pt-4">
        <TrackView code={decodeURIComponent(params.code)} />
      </main>
    </>
  );
}
