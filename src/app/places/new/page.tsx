import type { Metadata } from "next";
import NewPlaceView from "@/components/views/NewPlaceView";

export const metadata: Metadata = { title: "Add a place" };
export default function Page() {
  return <NewPlaceView />;
}
