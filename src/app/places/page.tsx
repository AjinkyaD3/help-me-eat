import type { Metadata } from "next";
import PlacesView from "@/components/views/PlacesView";

export const metadata: Metadata = { title: "Places" };
export default function Page() {
  return <PlacesView />;
}
