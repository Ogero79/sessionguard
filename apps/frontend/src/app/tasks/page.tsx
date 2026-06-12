"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useTasks } from "@/lib/store";
import type { Task } from "@/lib/mock-data";
import {
  Plus,
  X,
  Trash2,
  Edit3,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
} from "lucide-react";

type Filter = "all" | "todo" | "in-progress" | "done";

export default function TasksPage() {
  return (
    <AppShell>
      <TasksContent />
    </AppShell>
  );
}

function TasksContent() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<Task["status"]>("todo");

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tasks.length },
    { key: "todo", label: "To Do", count: tasks.filter((t) => t.status === "todo").length },
    { key: "in-progress", label: "In Progress", count: tasks.filter((t) => t.status === "in-progress").length },
    { key: "done", label: "Done", count: tasks.filter((t) => t.status === "done").length },
  ];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setStatus("todo");
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate);
    setStatus(task.status);
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateTask(editingId, { title, description, dueDate, status });
    } else {
      addTask({ title, description, dueDate, status });
    }
    resetForm();
  };

  const cycleStatus = (task: Task) => {
    const next: Record<Task["status"], Task["status"]> = {
      todo: "in-progress",
      "in-progress": "done",
      done: "todo",
    };
    updateTask(task.id, { status: next[task.status] });
  };

  const statusIcon = (s: Task["status"]) => {
    if (s === "done") return <CheckCircle className="h-[18px] w-[18px] text-success-500" />;
    if (s === "in-progress") return <Clock className="h-[18px] w-[18px] text-warning-500" />;
    return <Circle className="h-[18px] w-[18px] text-surface-300" />;
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">My Tasks</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Manage and track your work items
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-6 p-1 bg-surface-100 rounded-lg w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              filter === f.key
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[11px] text-ink-400">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink-900">
                {editingId ? "Edit Task" : "New Task"}
              </h3>
              <button onClick={resetForm} className="btn-ghost p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="input"
                  placeholder="What needs to be done?"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Add details about this task..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as Task["status"])
                    }
                    className="input"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="card divide-y divide-surface-100">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ListIcon className="h-10 w-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-ink-400">No tasks found</p>
          </div>
        ) : (
          filtered.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 px-5 py-4 group hover:bg-surface-50 transition-colors"
            >
              <button
                onClick={() => cycleStatus(task)}
                className="mt-0.5 flex-shrink-0"
                title="Toggle status"
              >
                {statusIcon(task.status)}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-medium ${
                    task.status === "done"
                      ? "text-ink-400 line-through"
                      : "text-ink-900"
                  }`}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-[12px] text-ink-400 mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
                    <Calendar className="h-3 w-3" /> {task.dueDate}
                  </span>
                  <span
                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      task.status === "done"
                        ? "bg-success-50 text-success-600"
                        : task.status === "in-progress"
                        ? "bg-warning-50 text-warning-600"
                        : "bg-surface-100 text-ink-500"
                    }`}
                  >
                    {task.status === "in-progress"
                      ? "In Progress"
                      : task.status === "done"
                      ? "Done"
                      : "To Do"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(task)}
                  className="btn-ghost p-1.5"
                  title="Edit"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="btn-ghost p-1.5 text-danger-500 hover:text-danger-600"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ListIcon({ className }: { className?: string }) {
  return <CheckCircle className={className} />;
}
