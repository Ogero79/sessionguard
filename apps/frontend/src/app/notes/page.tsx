"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useNotes } from "@/lib/store";
import type { Note } from "@/lib/mock-data";
import { Plus, Trash2, Save, X, StickyNote, FileText } from "lucide-react";

export default function NotesPage() {
  return (
    <AppShell>
      <NotesContent />
    </AppShell>
  );
}

function NotesContent() {
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectNote = (note: Note) => {
    setSelectedId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsNew(false);
    setDirty(false);
  };

  const startNew = () => {
    setSelectedId(null);
    setEditTitle("");
    setEditContent("");
    setIsNew(true);
    setDirty(false);
  };

  const handleSave = () => {
    if (!editTitle.trim()) return;
    if (isNew) {
      addNote(editTitle, editContent);
      setIsNew(false);
    } else if (selectedId) {
      updateNote(selectedId, { title: editTitle, content: editContent });
    }
    setDirty(false);
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    if (selectedId === id) {
      setSelectedId(null);
      setEditTitle("");
      setEditContent("");
    }
  };

  const closeEditor = () => {
    setSelectedId(null);
    setIsNew(false);
    setEditTitle("");
    setEditContent("");
    setDirty(false);
  };

  const hasEditor = isNew || selectedId;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Notes</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Capture ideas, meeting notes, and more
          </p>
        </div>
        <button onClick={startNew} className="btn-primary">
          <Plus className="h-4 w-4" /> New Note
        </button>
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Notes list */}
        <div className="w-72 flex-shrink-0">
          <div className="card divide-y divide-surface-100">
            {notes.length === 0 ? (
              <div className="py-12 text-center">
                <StickyNote className="h-8 w-8 text-surface-300 mx-auto mb-2" />
                <p className="text-sm text-ink-400">No notes yet</p>
              </div>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-50 transition-colors ${
                    selectedId === note.id ? "bg-brand-50" : ""
                  }`}
                >
                  <p
                    className={`text-[13px] font-medium truncate ${
                      selectedId === note.id
                        ? "text-brand-700"
                        : "text-ink-800"
                    }`}
                  >
                    {note.title}
                  </p>
                  <p className="text-[11px] text-ink-400 mt-0.5 line-clamp-1">
                    {note.content.slice(0, 60)}
                  </p>
                  <p className="text-[10px] text-ink-300 mt-1">
                    {new Date(note.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          {hasEditor ? (
            <div className="card h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
                <div className="flex items-center gap-2 text-ink-500">
                  <FileText className="h-4 w-4" />
                  <span className="text-[13px] font-medium">
                    {isNew ? "New Note" : "Editing"}
                  </span>
                  {dirty && (
                    <span className="text-[11px] text-warning-500 font-medium">
                      (unsaved)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!editTitle.trim()}
                    className="btn-primary text-[12px] py-1.5 px-3"
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                  {selectedId && (
                    <button
                      onClick={() => handleDelete(selectedId)}
                      className="btn-ghost p-1.5 text-danger-500 hover:text-danger-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={closeEditor} className="btn-ghost p-1.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setDirty(true);
                  }}
                  className="text-xl font-bold text-ink-900 border-none outline-none placeholder:text-ink-300 bg-transparent"
                  placeholder="Note title"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    setDirty(true);
                  }}
                  className="flex-1 text-[14px] leading-relaxed text-ink-700 border-none outline-none resize-none placeholder:text-ink-300 bg-transparent"
                  placeholder="Start writing your note..."
                />
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center">
                <StickyNote className="h-10 w-10 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-ink-400">
                  Select a note or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
