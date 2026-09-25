import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getEmployeeDirectory, directoryToMap } from "../lib/employeeDirectory";
import type {
  EmployeeDirectoryEntry,
  KpiAssignment,
  KpiPeriod,
  KpiQuestion,
  KpiResponse,
} from "../types";

const RELATION_LABEL: Record<string, string> = {
  atasan_ke_bawahan: "sebagai atasan",
  bawahan_ke_atasan: "sebagai bawahan",
  rekan_setim: "sebagai rekan setim",
};

export function MyKpi() {
  const { session } = useAuth();
  const [tab, setTab] = useState<"pending" | "results">("pending");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<KpiAssignment[]>([]);
  const [resultAssignments, setResultAssignments] = useState<KpiAssignment[]>([]);
  const [periods, setPeriods] = useState<Record<string, KpiPeriod>>({});
  const [directory, setDirectory] = useState<Record<string, EmployeeDirectoryEntry>>({});
  const [responses, setResponses] = useState<KpiResponse[]>([]);
  const [questions, setQuestions] = useState<Record<string, KpiQuestion>>({});
  const [activeAssignment, setActiveAssignment] = useState<KpiAssignment | null>(null);

  async function load() {
    if (!session?.user) return;
    setLoading(true);
    const [{ data: pendingData }, { data: resultData }, dir] = await Promise.all([
      supabase.from("kpi_assignments").select("*").eq("reviewer_id", session.user.id).eq("status", "pending"),
      supabase.from("kpi_assignments").select("*").eq("subject_id", session.user.id),
      getEmployeeDirectory(),
    ]);
    const pendingRows = (pendingData as KpiAssignment[]) || [];
    const resultRows = (resultData as KpiAssignment[]) || [];
    setPending(pendingRows);
    setResultAssignments(resultRows);
    setDirectory(directoryToMap(dir));

    const periodIds = Array.from(new Set([...pendingRows, ...resultRows].map((a) => a.period_id)));
    if (periodIds.length > 0) {
      const { data: periodData } = await supabase.from("kpi_periods").select("*").in("id", periodIds);
      const map: Record<string, KpiPeriod> = {};
      for (const p of (periodData as KpiPeriod[]) || []) map[p.id] = p;
      setPeriods(map);
    }

    if (resultRows.length > 0) {
      const { data: responseData } = await supabase
        .from("kpi_responses")
        .select("*")
        .in("assignment_id", resultRows.map((a) => a.id));
      setResponses((responseData as KpiResponse[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function openAssignment(a: KpiAssignment) {
    setActiveAssignment(a);
    const period = periods[a.period_id];
    const { data: q } = await supabase
      .from("kpi_questions")
      .select("*")
      .eq("template_id", period.template_id)
      .in("relation_scope", ["semua", a.relation])
      .order("order_index");
    const map: Record<string, KpiQuestion> = {};
    for (const item of (q as KpiQuestion[]) || []) map[item.id] = item;
    setQuestions(map);
  }

  if (activeAssignment) {
    return (
      <FillAssignmentForm
        assignment={activeAssignment}
        questions={Object.values(questions).sort((a, b) => a.order_index - b.order_index)}
        subjectName={directory[activeAssignment.subject_id]?.full_name || "-"}
        onClose={() => setActiveAssignment(null)}
        onSubmitted={() => {
          setActiveAssignment(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">KPI 360°</h1>
      <div className="flex gap-2">
        <button
          className={`px-3 py-1.5 rounded text-sm font-semibold ${tab === "pending" ? "bg-primary text-white" : "bg-white border border-line text-ink/60"}`}
          onClick={() => setTab("pending")}
        >
          Perlu Dinilai {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          className={`px-3 py-1.5 rounded text-sm font-semibold ${tab === "results" ? "bg-primary text-white" : "bg-white border border-line text-ink/60"}`}
          onClick={() => setTab("results")}
        >
          Hasil Saya
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <p className="text-sm text-ink/50">Tidak ada penilaian yang perlu diisi saat ini.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((a) => (
              <button key={a.id} className="card w-full text-left hover:border-primary" onClick={() => openAssignment(a)}>
                <p className="font-semibold">{directory[a.subject_id]?.full_name || "-"}</p>
                <p className="text-xs text-ink/50">
                  {periods[a.period_id]?.name} · {RELATION_LABEL[a.relation]}
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        <KpiResultsView
          assignments={resultAssignments.filter((a) => periods[a.period_id]?.status === "closed")}
          periods={periods}
          responses={responses}
          directory={directory}
        />
      )}
    </div>
  );
}

function KpiResultsView({
  assignments,
  periods,
  responses,
  directory,
}: {
  assignments: KpiAssignment[];
  periods: Record<string, KpiPeriod>;
  responses: KpiResponse[];
  directory: Record<string, EmployeeDirectoryEntry>;
}) {
  if (assignments.length === 0) {
    return <p className="text-sm text-ink/50">Belum ada hasil KPI yang tersedia (periode belum ditutup).</p>;
  }
  const byPeriod: Record<string, KpiAssignment[]> = {};
  for (const a of assignments) (byPeriod[a.period_id] ??= []).push(a);

  return (
    <div className="space-y-4">
      {Object.entries(byPeriod).map(([periodId, list]) => {
        const allResponses = list.flatMap((a) => responses.filter((r) => r.assignment_id === a.id));
        const avg = allResponses.length
          ? (allResponses.reduce((s, r) => s + r.score, 0) / allResponses.length).toFixed(1)
          : "-";
        return (
          <div key={periodId} className="card space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{periods[periodId]?.name}</p>
              <span className="text-lg font-extrabold text-primary-dark">{avg}</span>
            </div>
            {list.map((a) => {
              const rs = responses.filter((r) => r.assignment_id === a.id);
              if (rs.length === 0) return null;
              return (
                <div key={a.id} className="border-t border-line pt-2">
                  <p className="text-xs font-semibold text-ink/50 mb-1">
                    {RELATION_LABEL[a.relation]} — {directory[a.reviewer_id]?.full_name || "-"}
                  </p>
                  {rs.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm py-0.5">
                      <span className="text-ink/70">{r.comment ? r.comment : "Skor"}</span>
                      <span className="font-semibold">{r.score}/5</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FillAssignmentForm({
  assignment,
  questions,
  subjectName,
  onClose,
  onSubmitted,
}: {
  assignment: KpiAssignment;
  questions: KpiQuestion[];
  subjectName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = questions.length > 0 && questions.every((q) => scores[q.id]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      for (const q of questions) {
        const { error: rpcError } = await supabase.rpc("submit_kpi_response", {
          p_assignment_id: assignment.id,
          p_question_id: q.id,
          p_score: scores[q.id],
          p_comment: comments[q.id] || null,
        });
        if (rpcError) throw rpcError;
      }
      const { error: finalizeError } = await supabase.rpc("finalize_kpi_assignment", {
        p_assignment_id: assignment.id,
      });
      if (finalizeError) throw finalizeError;
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim penilaian.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button className="text-sm font-semibold text-ink/50" onClick={onClose}>
        ← Batal
      </button>
      <div>
        <h1 className="text-lg font-extrabold tracking-tight">Menilai {subjectName}</h1>
        <p className="text-sm text-ink/50">{RELATION_LABEL[assignment.relation]}</p>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-ink/50">Tidak ada pertanyaan untuk penilaian ini.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="card space-y-2">
              <p className="text-sm font-medium">{q.question_text}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setScores((s) => ({ ...s, [q.id]: n }))}
                    className={`h-9 w-9 rounded-full text-sm font-semibold border ${
                      scores[q.id] === n ? "bg-primary text-white border-primary" : "border-line text-ink/60"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                className="input"
                placeholder="Catatan (opsional)"
                value={comments[q.id] || ""}
                onChange={(e) => setComments((c) => ({ ...c, [q.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
      <button className="btn-primary w-full" onClick={handleSubmit} disabled={!allAnswered || submitting}>
        {submitting ? "Mengirim..." : "Kirim Penilaian"}
      </button>
    </div>
  );
}
