import React, { useMemo, useState } from "react";


// FR04 Storage Keys 

const LS_FR03_PLAN = "fr03_sprint_plan_output";
const LS_FR04_PLAN = "fr04_final_plan_output";
const LS_FR04_AUDIT = "fr04_audit_log";


// Helpers 
function nowUtcIso() {
  return new Date().toISOString();
}

function deepCopy(x) {
  return JSON.parse(JSON.stringify(x));
}

function allTasksFlat(plan) {
  const out = [];
  (plan?.sprints || []).forEach((sp) => {
    (sp?.tasks || []).forEach((t) => out.push(t));
  });
  return out;
}

function titleToTask(plan) {
  const d = {};
  allTasksFlat(plan).forEach((t) => {
    const title = (t?.title || "").trim();
    if (title) d[title] = t;
  });
  return d;
}

function titleToSprintIndex(plan) {
  const d = {};
  (plan?.sprints || []).forEach((sp, i) => {
    (sp?.tasks || []).forEach((t) => {
      const title = (t?.title || "").trim();
      if (title) d[title] = i;
    });
  });
  return d;
}

function recomputeSprintCapacity(sprint) {
  let used = 0;
  (sprint?.tasks || []).forEach((t) => {
    if (t?.status === "removed") return;
    used += Number(t?.estimate_days ?? 1);
  });
  sprint.used_days = used;
  sprint.remaining_capacity_days = Math.max(
    0,
    Number(sprint?.capacity_days ?? 14) - used
  );
}

function recomputeAll(plan) {
  (plan?.sprints || []).forEach((sp) => recomputeSprintCapacity(sp));
  const total = (plan?.sprints || []).reduce(
    (sum, sp) => sum + Number(sp?.used_days ?? 0),
    0
  );
  plan.summary = plan.summary || {};
  plan.summary.num_sprints = (plan?.sprints || []).length;
  plan.summary.total_estimated_days = total;
  plan.summary.avg_days_per_sprint = Number(
    (total / Math.max(1, plan.summary.num_sprints)).toFixed(2)
  );
}

function validatePlan(plan) {
  const errors = [];
  const warnings = [];

  const tmap = titleToTask(plan);
  const sprintIdx = titleToSprintIndex(plan);

  // missing/removed deps
  allTasksFlat(plan).forEach((t) => {
    if (t?.status === "removed") return;
    const title = t?.title || "";
    const deps = t?.depends_on || [];
    deps.forEach((depTitle) => {
      const dep = tmap[depTitle];
      if (!dep)
        errors.push(
          `Task '${title}' depends on missing task title '${depTitle}'.`
        );
      else if (dep?.status === "removed")
        errors.push(`Task '${title}' depends on REMOVED task '${depTitle}'.`);
    });
  });

  // sprint ordering for deps
  allTasksFlat(plan).forEach((t) => {
    if (t?.status === "removed") return;
    const title = t?.title || "";
    const myIdx = sprintIdx[title];
    if (myIdx === undefined) return;

    (t?.depends_on || []).forEach((depTitle) => {
      const depIdx = sprintIdx[depTitle];
      if (depIdx === undefined) return;
      if (depIdx > myIdx) {
        errors.push(
          `Sprint ordering error: '${title}' is in Sprint ${myIdx + 1} but dependency '${depTitle}' is in Sprint ${depIdx + 1}.`
        );
      }
    });
  });

  // capacity warnings
  (plan?.sprints || []).forEach((sp) => {
    if (Number(sp?.used_days ?? 0) > Number(sp?.capacity_days ?? 14)) {
      warnings.push(
        `Capacity warning: ${sp?.sprint_id} used_days=${sp?.used_days} > capacity_days=${sp?.capacity_days}.`
      );
    }
  });

  return { errors, warnings };
}

function auditPush(auditLog, action, by, extra = {}) {
  auditLog.push({ timestamp_utc: nowUtcIso(), action, by, ...extra });
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


// Component

export default function FR04() {
  const [statusMsg, setStatusMsg] = useState("");

  const [plan, setPlan] = useState(() => {
    const raw = localStorage.getItem(LS_FR04_PLAN) || localStorage.getItem(LS_FR03_PLAN);
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      p.status = p.status || "draft";
      p.last_modified_utc = p.last_modified_utc || nowUtcIso();
      recomputeAll(p);
      return p;
    } catch {
      return null;
    }
  });

  const [auditLog, setAuditLog] = useState(() => {
    const raw = localStorage.getItem(LS_FR04_AUDIT);
    if (!raw) return [];
    try {
      return JSON.parse(raw)?.audit_log || [];
    } catch {
      return [];
    }
  });

  const validation = useMemo(
    () => (plan ? validatePlan(plan) : { errors: [], warnings: [] }),
    [plan]
  );

  // UI state
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");

  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyForm, setModifyForm] = useState({ title: "", estimate: "", deps: "" });

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveForm, setMoveForm] = useState({ taskId: "", targetSprint: "" });

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeForm, setRemoveForm] = useState({ taskId: "", reason: "" });

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ sprintId: "", title: "", estimate: 2, deps: "" });

  // finders
  function findSprint(sid) {
    return (plan?.sprints || []).find((sp) => sp.sprint_id === sid) || null;
  }
  function findTask(tid) {
    return allTasksFlat(plan).find((t) => t.id === tid) || null;
  }

  // Actions
  function importPlan() {
    try {
      const p = JSON.parse(importText);
      p.status = p.status || "draft";
      p.last_modified_utc = nowUtcIso();
      recomputeAll(p);

      localStorage.setItem(LS_FR03_PLAN, JSON.stringify(p));
      localStorage.setItem(LS_FR04_PLAN, JSON.stringify(p));

      setPlan(p);
      setAuditLog([]);
      localStorage.setItem(LS_FR04_AUDIT, JSON.stringify({ audit_log: [] }));

      setStatusMsg("Imported FR03 plan and started FR04 draft.");
      setImportOpen(false);
    } catch {
      setStatusMsg("Invalid JSON. Paste full fr03_sprint_plan_output.json content.");
    }
  }

  function saveDraft() {
    if (!plan) return;
    const p = deepCopy(plan);
    p.status = "draft";
    p.last_modified_utc = nowUtcIso();
    recomputeAll(p);

    localStorage.setItem(LS_FR04_PLAN, JSON.stringify(p));
    localStorage.setItem(LS_FR04_AUDIT, JSON.stringify({ audit_log: auditLog }));

    setPlan(p);
    setStatusMsg("Draft saved (localStorage).");
  }

  function approveAndSave() {
    if (!plan) return;
    if (validation.errors.length) {
      setStatusMsg("Cannot approve: fix validation errors first.");
      return;
    }
    const p = deepCopy(plan);
    p.status = "approved";
    p.approved_by = "Project Manager";
    p.approved_at_utc = nowUtcIso();
    p.last_modified_utc = nowUtcIso();
    recomputeAll(p);

    const newAudit = deepCopy(auditLog);
    auditPush(newAudit, "approve_plan", "Project Manager");

    localStorage.setItem(LS_FR04_PLAN, JSON.stringify(p));
    localStorage.setItem(LS_FR04_AUDIT, JSON.stringify({ audit_log: newAudit }));

    setPlan(p);
    setAuditLog(newAudit);
    setStatusMsg("Approved and saved.");
  }

  function openModify(tid) {
    const t = findTask(tid);
    if (!t) return;
    setSelectedTaskId(tid);
    setModifyForm({
      title: t.title || "",
      estimate: String(t.estimate_days ?? ""),
      deps: (t.depends_on || []).join(", "),
    });
    setModifyOpen(true);
  }

  function applyModify() {
    const p = deepCopy(plan);
    const t = allTasksFlat(p).find((x) => x.id === selectedTaskId);
    if (!t) return;

    const before = {
      title: t.title,
      estimate_days: t.estimate_days,
      depends_on: t.depends_on || [],
    };

    const title = modifyForm.title.trim();
    if (title) t.title = title;

    const est = Number(modifyForm.estimate);
    if (Number.isFinite(est) && est > 0) t.estimate_days = est;

    const deps = modifyForm.deps
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    t.depends_on = deps;

    const newAudit = deepCopy(auditLog);
    auditPush(newAudit, "modify_task", "Project Manager", {
      task_id: selectedTaskId,
      before,
      after: {
        title: t.title,
        estimate_days: t.estimate_days,
        depends_on: t.depends_on,
      },
    });

    p.last_modified_utc = nowUtcIso();
    recomputeAll(p);

    setPlan(p);
    setAuditLog(newAudit);
    setModifyOpen(false);
    setStatusMsg("Task modified.");
  }

  function openMove(tid) {
    setMoveForm({ taskId: tid, targetSprint: "" });
    setMoveOpen(true);
  }

  function applyMove() {
    const { taskId, targetSprint } = moveForm;
    const p = deepCopy(plan);

    const fromSprint = (p.sprints || []).find((sp) => (sp.tasks || []).some((t) => t.id === taskId));
    const toSprint = (p.sprints || []).find((sp) => sp.sprint_id === targetSprint);

    if (!fromSprint) return setStatusMsg("Task not found in any sprint.");
    if (!toSprint) return setStatusMsg("Target sprint not found.");

    const idx = fromSprint.tasks.findIndex((t) => t.id === taskId);
    const [taskObj] = fromSprint.tasks.splice(idx, 1);
    toSprint.tasks.push(taskObj);

    const newAudit = deepCopy(auditLog);
    auditPush(newAudit, "move_task", "Project Manager", {
      task_id: taskId,
      from_sprint: fromSprint.sprint_id,
      to_sprint: toSprint.sprint_id,
    });

    p.last_modified_utc = nowUtcIso();
    recomputeAll(p);

    setPlan(p);
    setAuditLog(newAudit);
    setMoveOpen(false);
    setStatusMsg("Task moved.");
  }

  function openRemove(tid) {
    setRemoveForm({ taskId: tid, reason: "" });
    setRemoveOpen(true);
  }

  function applyRemove() {
    const { taskId, reason } = removeForm;
    const p = deepCopy(plan);
    const t = allTasksFlat(p).find((x) => x.id === taskId);
    if (!t) return setStatusMsg("Task not found.");

    t.status = "removed";
    t.removed_reason = reason.trim();

    const newAudit = deepCopy(auditLog);
    auditPush(newAudit, "remove_task", "Project Manager", {
      task_id: taskId,
      reason: reason.trim(),
    });

    p.last_modified_utc = nowUtcIso();
    recomputeAll(p);

    setPlan(p);
    setAuditLog(newAudit);
    setRemoveOpen(false);
    setStatusMsg("Task removed (status=removed).");
  }

  function openAdd(sprintId) {
    setAddForm({ sprintId, title: "", estimate: 2, deps: "" });
    setAddOpen(true);
  }

  function applyAdd() {
    const p = deepCopy(plan);
    const sp = (p.sprints || []).find((x) => x.sprint_id === addForm.sprintId);
    if (!sp) return setStatusMsg("Sprint not found.");

    const existingIds = allTasksFlat(p).map((t) => t.id);
    const newId = `H-${String(existingIds.length + 1).padStart(3, "0")}`;

    const deps = addForm.deps
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const newTask = {
      id: newId,
      title: addForm.title.trim(),
      estimate_days: Number(addForm.estimate) || 2,
      depends_on: deps,
      type: "human_override",
      status: "active",
    };

    sp.tasks = sp.tasks || [];
    sp.tasks.push(newTask);

    const newAudit = deepCopy(auditLog);
    auditPush(newAudit, "add_task", "Project Manager", {
      task_id: newId,
      sprint_id: sp.sprint_id,
      task: {
        title: newTask.title,
        estimate_days: newTask.estimate_days,
        depends_on: newTask.depends_on,
      },
    });

    p.last_modified_utc = nowUtcIso();
    recomputeAll(p);

    setPlan(p);
    setAuditLog(newAudit);
    setAddOpen(false);
    setStatusMsg(" Task added.");
  }

  function clearEverything() {
    setImportText("");
    setPlan(null);
    setAuditLog([]);
    setSelectedSprintId("");
    setSelectedTaskId("");
    setModifyOpen(false);
    setMoveOpen(false);
    setRemoveOpen(false);
    setAddOpen(false);
    try {
      localStorage.removeItem(LS_FR03_PLAN);
      localStorage.removeItem(LS_FR04_PLAN);
      localStorage.removeItem(LS_FR04_AUDIT);
    } catch (e) {
      // ignore
    }
    setStatusMsg("Cleared plan, inputs, and audit log.");
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Human Review / Approve</h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50"
            onClick={() => setImportOpen(true)}>
            Import Sprint Plan JSON
          </button>
          <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
            onClick={clearEverything}>
            Clear All
          </button>
          <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50"
            onClick={saveDraft}>
            Save Draft
          </button>
          <button className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
            onClick={approveAndSave}>
            Approve & Save
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="mt-4 rounded-xl bg-white ring-1 ring-gray-200 p-3 text-sm">
          {statusMsg}
        </div>
      )}

      {/* Import */}
      {importOpen && (
        <div className="mt-4 rounded-2xl bg-white ring-1 ring-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Paste fr03_sprint_plan_output.json</h2>
            <button className="text-sm underline" onClick={() => setImportOpen(false)}>Close</button>
          </div>
          <textarea
            className="mt-3 w-full rounded-xl ring-1 ring-gray-200 p-3 font-mono text-xs"
            rows={10}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              onClick={importPlan}>
              Import
            </button>
            <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50"
              onClick={() => setImportOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Plan Summary</h2>
        {plan ? (
          <div className="mt-2 text-sm text-gray-700 space-y-1">
            <div><span className="font-semibold">Status:</span> {plan.status || "draft"}</div>
            <div><span className="font-semibold">Goal:</span> {plan.original_goal || "(no goal)"}</div>
            <div><span className="font-semibold">Sprints:</span> {plan.summary?.num_sprints}</div>
            <div><span className="font-semibold">Total Estimated Days:</span> {plan.summary?.total_estimated_days}</div>
            <div><span className="font-semibold">Last Modified (UTC):</span> {plan.last_modified_utc}</div>

            <div className="pt-3">
              {(plan.sprints || []).map((sp) => (
                <div key={sp.sprint_id} className="py-2 border-t">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold">{sp.sprint_id}</span>{" "}
                      <span className="text-gray-600">
                        used {sp.used_days}/{sp.capacity_days} (remaining {sp.remaining_capacity_days})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                        onClick={() => setSelectedSprintId(sp.sprint_id)}
                      >
                        View Tasks
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                        onClick={() => openAdd(sp.sprint_id)}
                      >
                        + Add Task
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 flex gap-2 flex-wrap">
              <button
                className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                onClick={() => downloadJSON("fr04_final_plan_output.json", plan)}
              >
                Export Plan JSON
              </button>
              <button
                className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                onClick={() => downloadJSON("fr04_audit_log.json", { audit_log: auditLog })}
              >
                Export Audit JSON
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-600">
            No plan loaded. Click <b>Import Sprint Plan JSON</b>.
          </div>
        )}
      </div>

      {/* Validation */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <h3 className="font-semibold text-gray-900">Validation Errors</h3>
          {validation.errors.length ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-red-700 space-y-1">
              {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          ) : (
            <div className="mt-2 text-sm text-gray-600">No errors </div>
          )}
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <h3 className="font-semibold text-gray-900">Warnings</h3>
          {validation.warnings.length ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-yellow-700 space-y-1">
              {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          ) : (
            <div className="mt-2 text-sm text-gray-600">No warnings </div>
          )}
        </div>
      </div>

      {/* Sprint Tasks */}
      {selectedSprintId && plan && (
        <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold">{selectedSprintId} Tasks</h3>
            <button className="text-sm underline" onClick={() => setSelectedSprintId("")}>
              Close
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {(findSprint(selectedSprintId)?.tasks || []).map((t) => (
              <div key={t.id} className="rounded-xl ring-1 ring-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-gray-900">{t.id} — {t.title}</div>
                    <div className="text-sm text-gray-600">
                      {t.estimate_days} days • status={t.status || "active"} • deps={(t.depends_on || []).join(", ") || "none"}
                    </div>
                    {t.removed_reason && (
                      <div className="text-sm text-red-700 mt-1">Removed reason: {t.removed_reason}</div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                      onClick={() => { setSelectedTaskId(t.id); }}
                    >
                      Details
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                      onClick={() => openModify(t.id)}
                    >
                      Modify
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                      onClick={() => openMove(t.id)}
                    >
                      Move
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm"
                      onClick={() => openRemove(t.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Details */}
      {selectedTaskId && plan && (
        <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Task Details</h3>
            <button className="text-sm underline" onClick={() => setSelectedTaskId("")}>
              Close
            </button>
          </div>

          {(() => {
            const t = findTask(selectedTaskId);
            if (!t) return <div className="mt-2 text-sm text-gray-600">Task not found.</div>;
            return (
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <div><span className="font-semibold">ID:</span> {t.id}</div>
                <div><span className="font-semibold">Title:</span> {t.title}</div>
                <div><span className="font-semibold">Estimate days:</span> {t.estimate_days}</div>
                <div><span className="font-semibold">Depends on:</span> {(t.depends_on || []).join(", ") || "none"}</div>
                <div><span className="font-semibold">Status:</span> {t.status || "active"}</div>
                {t.removed_reason && (
                  <div><span className="font-semibold">Removed reason:</span> {t.removed_reason}</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Modals */}
      {modifyOpen && (
        <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Modify Task {selectedTaskId}</h3>
            <button className="text-sm underline" onClick={() => setModifyOpen(false)}>Close</button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={modifyForm.title}
              onChange={(e) => setModifyForm({ ...modifyForm, title: e.target.value })}
              placeholder="New title"
            />
            <input className="rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={modifyForm.estimate}
              onChange={(e) => setModifyForm({ ...modifyForm, estimate: e.target.value })}
              placeholder="New estimate days (number)"
            />
            <input className="md:col-span-2 rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={modifyForm.deps}
              onChange={(e) => setModifyForm({ ...modifyForm, deps: e.target.value })}
              placeholder="depends_on titles (comma separated)"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              onClick={applyModify}>
              Apply
            </button>
            <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50"
              onClick={() => setModifyOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {moveOpen && (
        <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Move Task {moveForm.taskId}</h3>
            <button className="text-sm underline" onClick={() => setMoveOpen(false)}>Close</button>
          </div>

          <div className="mt-3 flex gap-3 flex-wrap items-center">
            <select
              className="rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={moveForm.targetSprint}
              onChange={(e) => setMoveForm({ ...moveForm, targetSprint: e.target.value })}
            >
              <option value="">Select target sprint…</option>
              {(plan?.sprints || []).map((sp) => (
                <option key={sp.sprint_id} value={sp.sprint_id}>{sp.sprint_id}</option>
              ))}
            </select>

            <button className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              onClick={applyMove}>
              Move
            </button>
          </div>
        </div>
      )}

      {removeOpen && (
        <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Remove Task {removeForm.taskId}</h3>
            <button className="text-sm underline" onClick={() => setRemoveOpen(false)}>Close</button>
          </div>

          <div className="mt-3">
            <input className="w-full rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={removeForm.reason}
              onChange={(e) => setRemoveForm({ ...removeForm, reason: e.target.value })}
              placeholder="Reason for removal"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              onClick={applyRemove}>
              Remove
            </button>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add Task to {addForm.sprintId}</h3>
            <button className="text-sm underline" onClick={() => setAddOpen(false)}>Close</button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              placeholder="Task title"
            />
            <input className="rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={addForm.estimate}
              onChange={(e) => setAddForm({ ...addForm, estimate: e.target.value })}
              placeholder="Estimate days"
            />
            <input className="md:col-span-2 rounded-xl ring-1 ring-gray-200 px-3 py-2"
              value={addForm.deps}
              onChange={(e) => setAddForm({ ...addForm, deps: e.target.value })}
              placeholder="depends_on titles (comma separated) or empty"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              onClick={applyAdd}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
