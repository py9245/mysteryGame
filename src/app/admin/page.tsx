import { AdminShell } from "@/features/admin";
import { loadAdminRuntimeData } from "@/features/admin/adminData";

export default async function AdminPage() {
  const data = await loadAdminRuntimeData();
  return <AdminShell data={data} />;
}
