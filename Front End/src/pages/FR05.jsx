import { useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

async function postJSON(path, payload) {
  // Show payload in console 
  console.log("[FR05] Sending payload to API:", payload);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  // Show raw response in console 
  console.log("[FR05] API response status:", res.status);
  console.log("[FR05] API response body:", data);

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

function formatPercent(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (n <= 1) return `${(n * 100).toFixed(2)}%`;
  return `${n.toFixed(2)}%`;
}

export default function FR05() {
  const [form, setForm] = useState({
    task_type: "Bug",
    assignee_role: "Developer",
    experience_years: 0,
    team_size: 1,
    sprint_length_days: 5,
    story_points: 13,
    estimated_hours: 50,
    dependencies_count: 6,
    blockers_count: 5,
    priority_moscow: "Won't",
    requirement_changes: 5,
    communication_volume: 180,
    sentiment_score: -0.9,
    ai_suggestion_used: 0,
    ai_acceptance_rate: 0.0,
  });

  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function predict() {
    setLoading(true);
    setOut(null);

    try {
      const data = await postJSON("/fr05", form);
      setOut(data);
    } catch (e) {
      console.error("[FR05] Predict error:", e);
      setOut({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  const prob =
    out?.probability ??
    out?.success_probability ??
    out?.task_success_probability;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-5">
        <div className="text-lg font-semibold text-gray-900">
          Task Success Prediction
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-800">Task Type</label>
            <select
              value={form.task_type}
              onChange={(e) => setField("task_type", e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              {["Feature", "Bug", "Refactor", "Chore", "Spike", "Documentation"].map(
                (x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">Assignee Role</label>
            <select
              value={form.assignee_role}
              onChange={(e) => setField("assignee_role", e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              {["Developer", "QA", "DevOps", "Designer", "PM"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          {[
            ["experience_years", "Experience (years)"],
            ["team_size", "Team Size"],
            ["sprint_length_days", "Sprint Length (days)"],
            ["story_points", "Story Points"],
            ["estimated_hours", "Estimated Hours"],
            ["dependencies_count", "Dependencies Count"],
            ["blockers_count", "Blockers Count"],
            ["requirement_changes", "Requirement Changes"],
            ["communication_volume", "Communication Volume"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-800">{label}</label>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => setField(key, Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium text-gray-800">Priority (MoSCoW)</label>
            <select
              value={form.priority_moscow}
              onChange={(e) => setField("priority_moscow", e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              {["Must", "Should", "Could", "Won't"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">
              Sentiment Score (-1..1)
            </label>
            <input
              type="number"
              step="0.1"
              min="-1"
              max="1"
              value={form.sentiment_score}
              onChange={(e) => setField("sentiment_score", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">AI Suggestion Used?</label>
            <select
              value={form.ai_suggestion_used}
              onChange={(e) => setField("ai_suggestion_used", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value={0}>0 (No)</option>
              <option value={1}>1 (Yes)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">
              AI Acceptance Rate (0..1)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={form.ai_acceptance_rate}
              onChange={(e) => setField("ai_acceptance_rate", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={predict}
            disabled={loading}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Working..." : "Predict Task Success Rate"}
          </button>

          <button
            type="button"
            onClick={() => setOut(null)}
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            Clear output
          </button>
        </div>

        {/*  Result */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-gray-800 mb-2">Result</div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            {out?.error ? (
              <div className="text-sm text-red-600 font-semibold">
                Error: {out.error}
              </div>
            ) : out ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Success Probability</div>
                <div className="text-3xl font-extrabold text-gray-900">
                  {formatPercent(prob)}
                </div>

                {out.risk_level ? (
                  <div className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                    Risk: {String(out.risk_level)}
                  </div>
                ) : null}

                <pre className="mt-3 rounded-xl bg-gray-50 p-3 text-xs overflow-auto max-h-44">
                  {JSON.stringify(out, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No output yet.</div>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          API: {API_BASE} • Endpoint: POST /fr05
        </div>
      </div>
    </div>
  );
}
