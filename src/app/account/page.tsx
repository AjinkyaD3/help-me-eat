import type { Metadata } from "next";
import AccountView from "@/components/views/AccountView";

export const metadata: Metadata = { title: "Account" };
export default function Page() {
  return <AccountView />;
}
