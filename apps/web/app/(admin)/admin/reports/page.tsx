import { Metadata } from "next";
import ReportsView from "./reports-view";

export const metadata: Metadata = {
  title: "Laporan | KRIYA",
};

export default function ReportsPage() {
  return <ReportsView />;
}
