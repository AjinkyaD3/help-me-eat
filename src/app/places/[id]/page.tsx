import { Suspense } from "react";
import PlaceDetailView from "@/components/views/PlaceDetailView";
import { Skeleton } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <PlaceDetailView />
    </Suspense>
  );
}
