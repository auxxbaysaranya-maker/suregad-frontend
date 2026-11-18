import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { api } from "../lib/api";
import { money } from "../lib/utils";
import { API_BASE } from "../lib/config";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, TextArea } from "../components/ui";

const RESULTS = ["passed", "failed", "not_tested", "not_applicable", "unable_to_verify"] as const;
type CheckResult = (typeof RESULTS)[number];

interface JobDetail {
  job: { _id: string; number: string; status: string; appointmentAt?: string };
  product?: { title?: string; city?: string; district?: string; slug?: string };
  evidence: { _id: string; caption?: string; checklistKey?: string }[];
  plan: { name: string; disclaimer?: string; checklist: { key: string; label: string; critical?: boolean }[] } | null;
}

export function PartnerJobPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ["partner-job", id], queryFn: async () => (await api.get(`/partner/jobs/${id}`)).data.data as JobDetail });
  const [when, setWhen] = useState("");
  const [summary, setSummary] = useState("");
  const [results, setResults] = useState<Record<string, { result: CheckResult; comment: string }>>({});
  const [error, setError] = useState<unknown>(null);
  const [verdict, setVerdict] = useState<{ verdict?: string; score?: number | null; criticalFailures?: string[]; disclaimer?: string } | null>(null);

  const schedule = useMutation({
    mutationFn: async () => api.post(`/partner/jobs/${id}/schedule`, { appointmentAt: new Date(when).toISOString() }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["partner-job", id] }),
    onError: setError,
  });
  const submit = useMutation({
    mutationFn: async () => {
      const checklist = detail.data?.plan?.checklist || [];
      const payload = checklist.map((item) => ({
        key: item.key,
        result: results[item.key]?.result || "not_tested",
        comment: results[item.key]?.comment || undefined,
        evidenceIds: [],
      }));
      return (await api.post(`/partner/jobs/${id}/report`, { results: payload, summary })).data.data as {
        verdict?: string;
        score?: number | null;
        criticalFailures?: string[];
        disclaimer?: string;
      };
    },
    onSuccess: (report) => setVerdict(report),
    onError: setError,
  });

  if (detail.isLoading) return <p>Loading job…</p>;
  if (detail.isError || !detail.data) return <Empty title="Job unavailable" body="This inspection is not assigned to your partner profile." />;
  const { job, product, plan, evidence } = detail.data;
  const incomplete = (plan?.checklist || []).some((item) => !results[item.key] || results[item.key].result === "not_tested");

  return (
    <div className="space-y-4">
      <Link to="/partner" className="text-sm text-brand">Back to jobs</Link>
      <div>
        <h1 className="text-3xl">{product?.title || job.number}</h1>
        <p className="mt-1 text-sm text-slate-500">{product?.city}{product?.district ? `, ${product.district}` : ""} · {job.number}</p>
        <Badge>{job.status.replaceAll("_", " ")}</Badge>
      </div>
      {error ? <ErrorNote error={error} /> : null}
      <Card className="space-y-3 p-4">
        <h2 className="text-xl">Appointment</h2>
        <Field label="Visit time">
          <Input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
        </Field>
        <Button disabled={!when || schedule.isPending} onClick={() => schedule.mutate()}>Save appointment</Button>
        {job.appointmentAt ? <p className="text-sm text-slate-500">Current: {new Date(job.appointmentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p> : null}
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="text-xl">Evidence</h2>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadEvidence(id, file).then(() => client.invalidateQueries({ queryKey: ["partner-job", id] })).catch(setError);
          }}
        />
        {evidence.map((item) => <p key={item._id} className="text-sm">{item.caption || item.checklistKey || "Evidence attached"}</p>)}
      </Card>
      <Card className="space-y-4 p-4">
        <h2 className="text-xl">{plan?.name || "Checklist"}</h2>
        <p className="text-sm text-slate-600">{plan?.disclaimer}</p>
        {(plan?.checklist || []).map((item) => (
          <div key={item.key} className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{item.label}</p>
              {item.critical ? <Badge tone="red">Critical</Badge> : null}
            </div>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={results[item.key]?.result || "not_tested"}
              onChange={(event) => setResults({ ...results, [item.key]: { result: event.target.value as CheckResult, comment: results[item.key]?.comment || "" } })}
            >
              {RESULTS.map((result) => <option key={result} value={result}>{result.replaceAll("_", " ")}</option>)}
            </select>
            <Input placeholder="Comment" value={results[item.key]?.comment || ""} onChange={(event) => setResults({ ...results, [item.key]: { result: results[item.key]?.result || "not_tested", comment: event.target.value } })} />
          </div>
        ))}
        <Field label="Summary"><TextArea value={summary} onChange={(event) => setSummary(event.target.value)} /></Field>
        <Button disabled={incomplete || submit.isPending || Boolean(verdict)} onClick={() => submit.mutate()}>Submit report</Button>
        <p className="text-xs text-slate-500">Every item needs a result other than “not tested”. A failed critical check stays visible even if the score is high. This report does not guarantee future reliability.</p>
        {verdict ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-medium">Verdict: {verdict.verdict?.replaceAll("_", " ")}{verdict.score != null ? ` · score ${verdict.score}` : ""}</p>
            {verdict.criticalFailures?.length ? <p className="mt-2 text-danger">Critical: {verdict.criticalFailures.join(", ")}</p> : null}
            <p className="mt-2">{verdict.disclaimer}</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

async function uploadEvidence(jobId: string, file: File) {
  const prepared = file.type.startsWith("image/")
    ? await imageCompression(file, { maxSizeMB: 1.2, maxWidthOrHeight: 1600, useWebWorker: true })
    : file;
  const signed = (await api.post("/uploads/sign", { purpose: "inspection_evidence", contentType: prepared.type || file.type, size: prepared.size })).data.data as {
    key: string;
    uploadUrl: string;
    method: "PUT" | "POST";
    fields?: Record<string, string>;
  };
  if (signed.fields) {
    const body = new FormData();
    for (const [name, value] of Object.entries(signed.fields)) body.append(name, value);
    body.append("file", prepared, file.name);
    const response = await fetch(signed.uploadUrl, { method: "POST", body });
    if (!response.ok) throw new Error("Evidence upload failed.");
  } else if (signed.method === "PUT") {
    const response = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": prepared.type || file.type }, body: prepared });
    if (!response.ok) throw new Error("Evidence upload failed.");
  } else {
    const token = localStorage.getItem("sg_token");
    const response = await fetch(`${API_BASE}/uploads/local?key=${encodeURIComponent(signed.key)}`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "", "Content-Type": prepared.type || file.type },
      body: prepared,
    });
    if (!response.ok) throw new Error("Evidence upload failed.");
  }
  await api.post(`/partner/jobs/${jobId}/evidence`, { key: signed.key, caption: file.name });
}

export function PartnerEarnings() {
  const rows = useQuery({ queryKey: ["earnings"], queryFn: async () => (await api.get("/partner/earnings")).data.data as { _id: string; amountPaise: number; status: string; note?: string }[] });
  const total = (rows.data || []).reduce((sum, row) => sum + row.amountPaise, 0);
  return (
    <div className="space-y-3">
      <h1 className="text-3xl">Earnings</h1>
      <Card className="p-4"><p className="text-sm text-slate-500">Recorded payouts</p><p className="text-2xl">{money(total)}</p><p className="mt-2 text-xs text-slate-500">SureGad records the amount owed. The transfer itself goes through an approved settlement provider, not an in-app balance.</p></Card>
      {(rows.data || []).map((row) => <Card key={row._id} className="p-4 text-sm">{money(row.amountPaise)} · {row.status}{row.note ? ` · ${row.note}` : ""}</Card>)}
      {rows.isSuccess && !rows.data.length ? <Empty title="No payouts yet" body="A payout record is created when you submit a complete inspection report." /> : null}
    </div>
  );
}

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
