import { useMemo, useState } from "react";
import { postJSON, API_BASE } from "../utils/api";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
      {children}
    </span>
  );
}

export default function FR02() {
  const [goalText, setGoalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);

  const tasks = useMemo(() => out?.tasks || [], [out]);

  async function runFR02() {
    setLoading(true);
    setOut(null);
    try {
      // adjust payload if your backend expects a different key
      const data = await postJSON("/fr02", { goal_text: goalText });

      setOut(data);

      // store for FR03 page
      localStorage.setItem("fr02_output", JSON.stringify(data));
    } catch (e) {
      setOut({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Task Decomposition
            </div>
            <div className="text-sm text-gray-500">
              Enter the project goal to get decomposed tasks 
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
            onClick={runFR02}
            disabled={loading || !goalText.trim()}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Working..." : "Generate Tasks (FR02)"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOut(null);
              localStorage.removeItem("fr02_output");
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
          <div className="text-lg font-semibold text-gray-900">Task Decomposition</div>
          {out?.decomposition_id ? <Badge>{out.decomposition_id}</Badge> : null}
        </div>

        {out?.error ? (
          <div className="mt-4 text-sm text-red-600 font-semibold">
            Error: {out.error}
          </div>
        ) : !out ? (
          <div className="mt-4 text-sm text-gray-500">No output yet.</div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {out.domain ? <Badge>Domain: {out.domain}</Badge> : null}
              {out.epic ? <Badge>Epic: {out.epic}</Badge> : null}
              {out.estimated_sprint_count_approx !== undefined ? (
                <Badge>Est sprints: {out.estimated_sprint_count_approx}</Badge>
              ) : null}
              {out.constraints?.time_text ? (
                <Badge>Time: {out.constraints.time_text}</Badge>
              ) : null}
            </div>

            {/* Tasks table */}
            <div className="mt-4 overflow-auto rounded-2xl ring-1 ring-gray-200">
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
                  {tasks.map((t) => (
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
                  {!tasks.length ? (
                    <tr className="border-t">
                      <td className="px-4 py-3 text-gray-500" colSpan={5}>
                        No tasks found in response.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Raw JSON */}
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-800 mb-2">
                Raw JSON
              </div>
              <pre className="rounded-2xl bg-gray-900 text-gray-100 p-4 text-xs overflow-auto max-h-96">
                {JSON.stringify(out, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
