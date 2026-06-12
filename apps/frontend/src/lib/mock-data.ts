export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  dueDate: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: "task" | "note" | "profile" | "login" | "request";
  description: string;
  timestamp: string;
}

export const SEED_TASKS: Task[] = [
  {
    id: "t1",
    title: "Prepare quarterly report",
    description:
      "Compile data from all departments and create the Q2 financial summary. Include revenue projections and expense breakdowns.",
    status: "in-progress",
    dueDate: "2026-05-10",
    createdAt: "2026-05-01",
  },
  {
    id: "t2",
    title: "Review team proposals",
    description:
      "Go through the 5 submitted proposals for the new client onboarding workflow and provide feedback.",
    status: "todo",
    dueDate: "2026-05-08",
    createdAt: "2026-05-02",
  },
  {
    id: "t3",
    title: "Update project roadmap",
    description:
      "Align the product roadmap with the new strategic priorities discussed in Monday's leadership meeting.",
    status: "todo",
    dueDate: "2026-05-12",
    createdAt: "2026-05-03",
  },
  {
    id: "t4",
    title: "Client presentation slides",
    description:
      "Finalize the slide deck for the Acme Corp partnership pitch on Thursday.",
    status: "in-progress",
    dueDate: "2026-05-07",
    createdAt: "2026-04-29",
  },
  {
    id: "t5",
    title: "Onboard new team member",
    description:
      "Set up workspace access, schedule intro meetings, and prepare welcome documentation for Sarah.",
    status: "done",
    dueDate: "2026-05-04",
    createdAt: "2026-04-28",
  },
  {
    id: "t6",
    title: "Expense report submission",
    description:
      "Submit April travel expenses with receipts attached. Maximum reimbursement deadline is May 15.",
    status: "done",
    dueDate: "2026-05-15",
    createdAt: "2026-05-01",
  },
];

export const SEED_NOTES: Note[] = [
  {
    id: "n1",
    title: "Meeting Notes — Sprint Planning",
    content:
      "Discussed priorities for the upcoming sprint. Key items:\n\n1. Finish the user dashboard redesign\n2. API performance improvements\n3. Mobile responsive fixes\n4. Customer feedback integration\n\nAction items assigned to respective team leads. Follow-up scheduled for Wednesday.",
    updatedAt: "2026-05-04T10:30:00Z",
    createdAt: "2026-05-04T09:00:00Z",
  },
  {
    id: "n2",
    title: "Product Ideas Brainstorm",
    content:
      "Potential features for Q3:\n\n- Workspace templates for new users\n- Collaborative task boards\n- Time tracking integration\n- Weekly digest emails\n- Custom dashboard widgets\n\nNeed to validate with user research before committing to roadmap.",
    updatedAt: "2026-05-03T15:45:00Z",
    createdAt: "2026-05-02T11:00:00Z",
  },
  {
    id: "n3",
    title: "Client Feedback Summary",
    content:
      "Compiled feedback from 12 enterprise clients:\n\n- 8/12 want better reporting\n- 6/12 need SSO integration\n- 5/12 requesting API access\n- 4/12 want mobile app\n\nPrioritize reporting and SSO for next quarter.",
    updatedAt: "2026-05-02T14:20:00Z",
    createdAt: "2026-05-01T10:00:00Z",
  },
];

export const SEED_ACTIVITIES: ActivityItem[] = [
  {
    id: "a1",
    type: "task",
    description: 'Completed task "Onboard new team member"',
    timestamp: "2026-05-04T14:30:00Z",
  },
  {
    id: "a2",
    type: "note",
    description: 'Updated note "Meeting Notes — Sprint Planning"',
    timestamp: "2026-05-04T10:30:00Z",
  },
  {
    id: "a3",
    type: "login",
    description: "Signed in from Chrome on Windows",
    timestamp: "2026-05-04T08:15:00Z",
  },
  {
    id: "a4",
    type: "profile",
    description: "Updated profile photo and bio",
    timestamp: "2026-05-03T16:45:00Z",
  },
  {
    id: "a5",
    type: "task",
    description: 'Created task "Client presentation slides"',
    timestamp: "2026-05-03T09:20:00Z",
  },
  {
    id: "a6",
    type: "request",
    description: "Submitted workspace support request #1042",
    timestamp: "2026-05-02T13:10:00Z",
  },
  {
    id: "a7",
    type: "note",
    description: 'Created note "Product Ideas Brainstorm"',
    timestamp: "2026-05-02T11:00:00Z",
  },
  {
    id: "a8",
    type: "task",
    description: 'Completed task "Expense report submission"',
    timestamp: "2026-05-01T17:00:00Z",
  },
  {
    id: "a9",
    type: "login",
    description: "Signed in from Firefox on macOS",
    timestamp: "2026-05-01T09:05:00Z",
  },
  {
    id: "a10",
    type: "profile",
    description: "Changed workspace notification preferences",
    timestamp: "2026-04-30T14:20:00Z",
  },
];
