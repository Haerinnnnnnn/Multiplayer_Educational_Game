export const initialModules = [
  {
    id: 1,
    title: 'Database Basics',
    description: 'Introductory database terms for QR matching practice.',
    questions: [
      {
        id: 101,
        question: 'What does SQL stand for?',
        answer: 'Structured Query Language',
      },
      {
        id: 102,
        question: 'Which key uniquely identifies a record?',
        answer: 'Primary Key',
      },
    ],
  },
  {
    id: 2,
    title: 'Software Engineering',
    description: 'Core software process and testing concepts.',
    questions: [
      {
        id: 201,
        question: 'Which model supports continuous task flow?',
        answer: 'Kanban',
      },
      {
        id: 202,
        question: 'What checks whether software meets user needs?',
        answer: 'Validation',
      },
    ],
  },
];

export const initialUsers = [
  { id: 1, name: 'Mr. Lee', email: 'teacher@example.com', role: 'Teacher' },
  { id: 2, name: 'Admin User', email: 'admin@example.com', role: 'Admin' },
];
