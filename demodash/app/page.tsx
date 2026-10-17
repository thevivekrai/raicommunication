import { HomeClient } from "@/components/customer/HomeClient";
import { config } from "@/lib/config";

export default function Home() {
  return <HomeClient shopName={config.shopName} />;
}
