import dynamic from "next/dynamic";
import { Skeleton } from "@/components/Skeleton";

/** Client-only map picker — shared loading fallback across report flows. */
export const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full rounded-xl" />,
  }
);
