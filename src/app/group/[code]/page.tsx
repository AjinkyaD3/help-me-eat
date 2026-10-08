import type { Metadata } from "next";
import { Suspense } from "react";
import GroupRoomView from "@/components/views/GroupRoomView";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Group spin", description: "Join and help pick what to eat." };
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <GroupRoomView />
    </Suspense>
  );
}
