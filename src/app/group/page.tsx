import type { Metadata } from "next";
import GroupStartView from "@/components/views/GroupStartView";

export const metadata: Metadata = { title: "Spin with friends" };
export default function Page() {
  return <GroupStartView />;
}
