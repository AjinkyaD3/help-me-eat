import type { Metadata } from "next";
import MapPageView from "@/components/views/MapPageView";

export const metadata: Metadata = { title: "Map" };
export default function Page() {
  return <MapPageView />;
}
