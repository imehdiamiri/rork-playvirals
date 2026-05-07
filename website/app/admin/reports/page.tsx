import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listReports, type ReportRow } from "@/lib/data";

/**
 * Admin moderation queue. Lists raw user reports with the reporter, target,
 * reason, optional context and status. Enables a basic Pending/Reviewed
 * triage flow via server actions.
 */
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; status?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const reports = await listReports({ reason: sp.reason, status: sp.status, limit: 200 });

  const reasons = ["all", "harassment", "hate_speech", "sexual_content", "spam", "cheating", "underage", "other"];
  const statuses = ["all", "pending", "reviewed"];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Link href="/admin" className="text-sm text-blue-500 hover:underline">
          ← Dashboard
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        <span className="text-gray-500">Reason:</span>
        {reasons.map((r) => {
          const active = (sp.reason ?? "all") === r;
          const params = new URLSearchParams();
          if (r !== "all") params.set("reason", r);
          if (sp.status) params.set("status", sp.status);
          const href = `/admin/reports${params.toString() ? `?${params}` : ""}`;
          return (
            <Link
              key={r}
              href={href}
              className={`px-2 py-1 rounded ${
                active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              {r}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-2 text-sm">
        <span className="text-gray-500">Status:</span>
        {statuses.map((s) => {
          const active = (sp.status ?? "all") === s;
          const params = new URLSearchParams();
          if (s !== "all") params.set("status", s);
          if (sp.reason) params.set("reason", sp.reason);
          const href = `/admin/reports${params.toString() ? `?${params}` : ""}`;
          return (
            <Link
              key={s}
              href={href}
              className={`px-2 py-1 rounded ${
                active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              {s}
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Reporter</th>
              <th className="p-3">Target</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Context</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No reports found.
                </td>
              </tr>
            ) : (
              reports.map((r: ReportRow) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(r.at).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <Link href={`/admin/users/${r.reporterUid}`} className="text-blue-500 hover:underline">
                      {r.reporterUid.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <Link href={`/admin/users/${r.targetUid}`} className="text-blue-500 hover:underline">
                      {r.targetUid.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="p-3">{r.reason}</td>
                  <td className="p-3 max-w-[280px] truncate" title={r.context}>
                    {r.context || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        r.status === "reviewed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Showing {reports.length} report(s). Reports are deduplicated server-side by
        (reporter, target, day) so a single user cannot flood the queue against
        the same target.
      </p>
    </div>
  );
}
