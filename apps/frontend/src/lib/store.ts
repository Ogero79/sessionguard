"use client";

import { useState, useCallback } from "react";
import {
  SEED_TASKS,
  SEED_NOTES,
  SEED_ACTIVITIES,
  type Task,
  type Note,
  type ActivityItem,
} from "./mock-data";

let globalTasks = [...SEED_TASKS];
let globalNotes = [...SEED_NOTES];
let globalActivities = [...SEED_ACTIVITIES];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(globalTasks);

  const sync = useCallback((next: Task[]) => {
    globalTasks = next;
    setTasks([...next]);
  }, []);

  const addTask = useCallback(
    (t: Omit<Task, "id" | "createdAt">) => {
      const newTask: Task = { ...t, id: uid(), createdAt: now() };
      sync([newTask, ...globalTasks]);
      globalActivities = [
        {
          id: uid(),
          type: "task",
          description: `Created task "${t.title}"`,
          timestamp: now(),
        },
        ...globalActivities,
      ];
    },
    [sync]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      sync(globalTasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [sync]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const t = globalTasks.find((x) => x.id === id);
      sync(globalTasks.filter((x) => x.id !== id));
      if (t) {
        globalActivities = [
          {
            id: uid(),
            type: "task",
            description: `Deleted task "${t.title}"`,
            timestamp: now(),
          },
          ...globalActivities,
        ];
      }
    },
    [sync]
  );

  return { tasks, addTask, updateTask, deleteTask };
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(globalNotes);

  const sync = useCallback((next: Note[]) => {
    globalNotes = next;
    setNotes([...next]);
  }, []);

  const addNote = useCallback(
    (title: string, content: string) => {
      const n: Note = {
        id: uid(),
        title,
        content,
        updatedAt: now(),
        createdAt: now(),
      };
      sync([n, ...globalNotes]);
      globalActivities = [
        {
          id: uid(),
          type: "note",
          description: `Created note "${title}"`,
          timestamp: now(),
        },
        ...globalActivities,
      ];
    },
    [sync]
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      sync(
        globalNotes.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: now() } : n
        )
      );
      const n = globalNotes.find((x) => x.id === id);
      if (n) {
        globalActivities = [
          {
            id: uid(),
            type: "note",
            description: `Updated note "${patch.title || n.title}"`,
            timestamp: now(),
          },
          ...globalActivities,
        ];
      }
    },
    [sync]
  );

  const deleteNote = useCallback(
    (id: string) => {
      const n = globalNotes.find((x) => x.id === id);
      sync(globalNotes.filter((x) => x.id !== id));
      if (n) {
        globalActivities = [
          {
            id: uid(),
            type: "note",
            description: `Deleted note "${n.title}"`,
            timestamp: now(),
          },
          ...globalActivities,
        ];
      }
    },
    [sync]
  );

  return { notes, addNote, updateNote, deleteNote };
}

export function useActivities() {
  const [activities] = useState<ActivityItem[]>(globalActivities);
  return { activities: globalActivities.length ? globalActivities : activities };
}
