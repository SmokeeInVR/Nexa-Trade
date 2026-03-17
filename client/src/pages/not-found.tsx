import { AppLayout } from "@/components/app-layout";
import { Link } from "wouter";
export default function NotFound() {
  return (
    <AppLayout title="Not Found">
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>404</div>
        <Link href="/session"><div style={{ color: "#D4A53E", cursor: "pointer" }}>← Back to Session</div></Link>
      </div>
    </AppLayout>
  );
}
