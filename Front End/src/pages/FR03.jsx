import { useMemo, useState } from "react";
import { postJSON, API_BASE } from "../utils/api";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
      {children}
    </span>
  );
}

export default function FR03() {
  const [goalText, setGoalText] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep both outputs (optional, but useful for UI)
  const [outFr02, setOutFr02] = useState(null);
  const [outFr03, setOutFr03] = useState(null);

  const fr02Tasks = useMemo(() => outFr02?.tasks || [], [outFr02]);
  const sprints = useMemo(() => outFr03?.sprints || [], [outFr03]);

  async function runFR03() {
    setLoading(true);
    setOutFr02(null);
    setOutFr03(null);

    try {
      // 1) FR02
      const fr02 = await postJSON("/fr02", { goal_text: goalText });
      setOutFr02(fr02);

      // Console debug
      console.log("[FR02] Output:", fr02);

      // 2) FR03 (feed FR02 output directly)
      const fr03 = await postJSON("/fr03", fr02);
      setOutFr03(fr03);

      // Console debug
      console.log("[FR03] Output:", fr03);

      // Optional store
      localStorage.setItem("fr02_output", JSON.stringify(fr02));
      localStorage.setItem("fr03_output", JSON.stringify(fr03));
    } catch (e) {
      console.error("[FR03 Combined] Error:", e);
      setOutFr03({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  const hasError = outFr03?.error;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Input */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Sprint Plan Generation (Goal → Tasks → Plan)
            </div>
            <div className="text-sm text-gray-500">
              Enter the project goal and generate sprint plan in one step.
            </div>
          </div>
          <Badge>API: {API_BASE}</Badge>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-gray-800">Project goal</label>
          <textarea
            rows={6}
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="Paste the project description here..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={runFR03}
            disabled={loading || !goalText.trim()}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Working..." : "Generate Sprint Plan"}
          </button>

          <button
            type="button"
            onClick={() => {
              setGoalText("");
              setOutFr02(null);
              setOutFr03(null);
              localStorage.removeItem("fr02_output");
              localStorage.removeItem("fr03_output");
            }}
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">Sprint Plan Output</div>
          {outFr03?.sprint_plan_id ? <Badge>{outFr03.sprint_plan_id}</Badge> : null}
        </div>

        {hasError ? (
          <div className="mt-4 text-sm text-red-600 font-semibold">
            Error: {outFr03.error}
          </div>
        ) : !outFr03 ? (
          <div className="mt-4 text-sm text-gray-500">No output yet.</div>
        ) : (
          <>
            {/* Summary */}
            <div className="mt-4 flex flex-wrap gap-2">
              {outFr02?.decomposition_id ? (
                <Badge>Decomposition: {outFr02.decomposition_id}</Badge>
              ) : null}
              {outFr02?.domain ? <Badge>Domain: {outFr02.domain}</Badge> : null}
              {outFr02?.epic ? <Badge>Epic: {outFr02.epic}</Badge> : null}

              {outFr03?.summary?.num_sprints !== undefined ? (
                <Badge>Sprints: {outFr03.summary.num_sprints}</Badge>
              ) : null}
              {outFr03?.summary?.total_estimated_days !== undefined ? (
                <Badge>Total days: {outFr03.summary.total_estimated_days}</Badge>
              ) : null}
              {outFr03?.assumptions?.sprint_length_days !== undefined ? (
                <Badge>
                  Sprint length: {outFr03.assumptions.sprint_length_days} days
                </Badge>
              ) : null}
            </div>

            {/* FR02 Tasks (optional preview) */}
            <div className="mt-5">
              <div className="text-sm font-semibold text-gray-800 mb-2">
                Decomposed Tasks 
              </div>
              <div className="overflow-auto rounded-2xl ring-1 ring-gray-200">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold text-gray-600">
                      <th className="px-4 py-3">Task ID</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Days</th>
                      <th className="px-4 py-3">Depends On</th>
                      <th className="px-4 py-3">Type</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {fr02Tasks.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {t.id}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{t.title}</td>
                        <td className="px-4 py-3 text-gray-800">
                          {t.estimate_days ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {(t.depends_on || []).length
                            ? (t.depends_on || []).join(", ")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{t.type ?? "task"}</td>
                      </tr>
                    ))}
                    {!fr02Tasks.length ? (
                      <tr className="border-t">
                        <td className="px-4 py-3 text-gray-500" colSpan={5}>
                          No tasks found in response.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FR03 Sprint Plan */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-800 mb-2">
                Sprint Plan (FR03)
              </div>

              <div className="space-y-4">
                {sprints.map((sp) => (
                  <div
                    key={sp.sprint_id}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-base font-bold text-gray-900">
                        {sp.sprint_id}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>Capacity: {sp.capacity_days}</Badge>
                        <Badge>Used: {sp.used_days}</Badge>
                        <Badge>Remaining: {sp.remaining_capacity_days}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 overflow-auto rounded-xl ring-1 ring-gray-200">
                      <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-xs font-semibold text-gray-600">
                            <th className="px-4 py-3">Task ID</th>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Days</th>
                            <th className="px-4 py-3">Depends On</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {(sp.tasks || []).map((t) => (
                            <tr key={t.id} className="border-t">
                              <td className="px-4 py-3 font-semibold text-gray-900">
                                {t.id}
                              </td>
                              <td className="px-4 py-3 text-gray-800">{t.title}</td>
                              <td className="px-4 py-3 text-gray-800">
                                {t.estimate_days ?? "-"}
                              </td>
                              <td className="px-4 py-3 text-gray-800">
                                {(t.depends_on || []).length
                                  ? (t.depends_on || []).join(", ")
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                          {!(sp.tasks || []).length ? (
                            <tr className="border-t">
                              <td className="px-4 py-3 text-gray-500" colSpan={4}>
                                No tasks in this sprint.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {!sprints.length ? (
                  <div className="text-sm text-gray-500">
                    No sprints found in response.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Raw JSON (optional) */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-800 mb-2">
                Raw JSON 
              </div>
              <pre className="rounded-2xl bg-gray-900 text-gray-100 p-4 text-xs overflow-auto max-h-96">
                {JSON.stringify(outFr03, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>

      <div className="text-xs text-gray-500">
        Flow: POST /fr02 → POST /fr03 (using FR02 output)
      </div>
    </div>
  );
}
