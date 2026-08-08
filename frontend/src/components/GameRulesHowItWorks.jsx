import React from 'react';

const RULE_CONTENT = {
  classic_mcq: {
    eyebrow: 'Classic MCQ Rules',
    title: 'Answer Fast, Learn After Every Question',
    intro:
      'Classic MCQ is an individual quiz mode. Answer each question, review the explanation, then move to the next one.',
    steps: [
      {
        title: 'Get Ready',
        description: 'A short countdown appears before the question starts.',
        color: 'blue',
      },
      {
        title: 'Pick One Answer',
        description: 'Choose A, B, C, or D before the timer ends.',
        color: 'purple',
      },
      {
        title: 'Score By Speed',
        description: 'Correct answers earn points. Faster correct answers can earn higher points.',
        color: 'cyan',
      },
      {
        title: 'Read Explanation',
        description: 'After answering, review the correct answer and explanation before continuing.',
        color: 'green',
      },
      {
        title: 'Finish And Rank',
        description: 'When everyone completes the quiz, the session moves to the result leaderboard.',
        color: 'orange',
      },
    ],
  },
  qr_pair_match: {
    eyebrow: 'QR Pair Match Rules',
    title: 'Find, Scan, Match, And Learn Together',
    intro:
      'QR Pair Match is a movement-based teamwork mode. Some students hold questions, while others hold answers and QR codes.',
    steps: [
      {
        title: 'Roles Are Assigned',
        description: 'You may become a Question Holder or an Answer Holder each round.',
        color: 'blue',
      },
      {
        title: 'Find The Match',
        description: 'Question Holders must find the correct Answer Holder for their question.',
        color: 'purple',
      },
      {
        title: 'Scan The QR',
        description: 'Scan the Answer Holder QR code to submit your answer.',
        color: 'cyan',
      },
      {
        title: 'Avoid Wrong Scans',
        description: 'Wrong scans can reduce time or lower your possible score.',
        color: 'orange',
      },
      {
        title: 'Review Then Continue',
        description: 'After each round, read the explanation before moving to the next round.',
        color: 'green',
      },
    ],
  },
};

function getRules(gameType) {
  return RULE_CONTENT[gameType] || RULE_CONTENT.classic_mcq;
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="rules-pin-icon" viewBox="0 0 24 24">
      <path d="M16 3a1 1 0 0 1 .12 1.99L16 5v4.76l1.9 3.79c.04.08.07.19.09.33L18 14v2a1 1 0 0 1-.88.99L17 17h-4v4a1 1 0 0 1-1.99.12L11 21v-4H7a1 1 0 0 1-.99-.88L6 16v-2c0-.12.02-.23.06-.34l.05-.11L8 9.76V5a1 1 0 0 1-.12-1.99L8 3h8z" />
    </svg>
  );
}

export function GameRulesHowItWorks({ gameType }) {
  const rules = getRules(gameType);

  return (
    <div className="game-rules-how-it-works">
      <div className="rules-heading">
        <p className="eyebrow">{rules.eyebrow}</p>
        <h3>{rules.title}</h3>
        <p>{rules.intro}</p>
      </div>

      <div className="rules-step-stage">
        <div className="rules-connector" aria-hidden="true" />
        {rules.steps.map((step, index) => (
          <article
            className={`rules-step-card rules-step-${index + 1} ${step.color}`}
            key={step.title}
            style={{ '--delay': `${index * 90}ms` }}
          >
            <PinIcon />
            <div className="rules-step-inner">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h4>{step.title}</h4>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
