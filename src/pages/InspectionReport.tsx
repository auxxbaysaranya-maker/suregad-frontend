import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Card, Empty } from "../components/ui";

export function InspectionReportPage() {
  const { reportId = "" } = useParams();
  const report = useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => (await api.get(`/inspection-reports/${reportId}/full`)).data.data as {
      score?: number | null;
      verdict?: string;
      criticalFailures?: string[];
      disclaimer?: string;
      summary?: string;
      results?: { label?: string; result?: string; comment?: string; critical?: boolean }[];
    },
  });
  if (report.isLoading) return <p>Loading report…</p>;
  if (report.isError || !report.data) return <Empty title="Report unavailable" body="Only the buyer, seller, assigned partner, or an admin can open this report." />;
  const data = report.data;
  return (
    <article className="space-y-4">
      <h1 className="text-3xl">Inspection report</h1>
      <p className="text-lg font-medium">{data.verdict?.replaceAll("_", " ")}{data.score != null ? ` · ${data.score}` : ""}</p>
      {data.criticalFailures?.length ? <p className="text-danger">Critical findings: {data.criticalFailures.join(", ")}</p> : null}
      <p className="text-sm text-slate-600">{data.disclaimer}</p>
      {data.summary ? <p>{data.summary}</p> : null}
      <div className="space-y-2">
        {(data.results || []).map((item) => (
          <Card key={`${item.label}-${item.result}`} className="p-4 text-sm">
            <p className="font-medium">{item.label}{item.critical ? " · critical" : ""}</p>
            <p>{item.result?.replaceAll("_", " ")}</p>
            {item.comment ? <p className="text-slate-500">{item.comment}</p> : null}
          </Card>
        ))}
      </div>
    </article>
  );
}
