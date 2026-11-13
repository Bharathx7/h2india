"use client";

import { Button, cx, Radio, RadioGroup } from "@h2india/ui";
import { useRef, useState } from "react";
import { quizAnswerAction } from "@/member/learning-actions";

// "Check your understanding" (471:1876): one question at a time, checked in the browser. For a signed-in member the
// first answer to each question counts towards their quiz score (step 7.5).

export interface QuizQuestion {
  question: string;
  options: string[];
  /** 1 for the first option. */
  answer: number;
  explanation?: string | null;
}

export function Quiz({
  questions,
  chapter,
}: {
  questions: QuizQuestion[];
  /** Set for a signed-in member. */ chapter?: string;
}) {
  const answered = useRef(new Set<number>());
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState("");
  const [checked, setChecked] = useState(false);
  const q = questions[index];
  if (!q) return null;
  const right = Number(choice) === q.answer;
  return (
    <section aria-labelledby="quiz" className="flex flex-col gap-3 rounded-card bg-subtle p-5">
      <p className="type-eyebrow text-secondary">
        CHECK YOUR UNDERSTANDING · {index + 1} OF {questions.length}
      </p>
      <h2 id="quiz" className="type-h4 text-primary">
        {q.question}
      </h2>
      <RadioGroup
        aria-labelledby="quiz"
        value={choice}
        onValueChange={(v) => {
          setChoice(v);
          setChecked(false);
        }}
      >
        {q.options.map((o, i) => (
          <Radio key={o} value={String(i + 1)} label={o} />
        ))}
      </RadioGroup>
      {checked ? (
        <p role="status" className={cx("type-body-sm", right ? "text-success" : "text-error")}>
          {right ? "Correct." : `Not quite: the answer is ${q.options[q.answer - 1] ?? ""}.`} {q.explanation ?? ""}
        </p>
      ) : null}
      <div className="flex gap-3">
        {checked && index < questions.length - 1 ? (
          <Button
            size="sm"
            onClick={() => {
              setIndex(index + 1);
              setChoice("");
              setChecked(false);
            }}
          >
            Next question
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!choice}
            onClick={() => {
              setChecked(true);
              if (chapter && !answered.current.has(index)) {
                answered.current.add(index);
                void quizAnswerAction(chapter, index, Number(choice) === q.answer);
              }
            }}
          >
            Check answer
          </Button>
        )}
      </div>
    </section>
  );
}
