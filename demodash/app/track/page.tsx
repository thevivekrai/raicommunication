import { Header } from "@/components/customer/Header";
import { TrackLookup } from "@/components/customer/TrackLookup";

export const metadata = { title: "Track your demo" };

export default function TrackPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-6">
        <TrackLookup />
      </main>
    </>
  );
}
