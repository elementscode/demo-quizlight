import { test, assert, equal, session, sql, ValidationError } from "@elements/app";
import { addQuestion, createQuiz, deleteQuestion, loadQuiz, saveQuestion, Question } from "#app/shared/services/quizzes";

function host(email: string): string {
  return sql<{ id: string }>(`
    insert into users (email, name, passwordHash) values (${email}, 'Host', 'x') returning id
  `).firstOrThrow().id;
}

function saveError(question: Question): string {
  try {
    saveQuestion(question);
  } catch (err) {
    assert(err instanceof ValidationError, `got ${err}`);

    return (err as ValidationError).message;
  }

  return "";
}

test("editing a quiz", () => {
  let me = host("me@example.com");
  let other = host("other@example.com");

  test("saves a question's prompt, answers, correct answer and time", () => {
    session.login({ userId: me, userName: "Host" });

    let quizId = createQuiz();
    let question = addQuestion(quizId);

    saveQuestion({ ...question, prompt: " Why? ", answerA: "a", answerB: "b", answerC: "c", answerD: "d", correct: 3, timeLimit: 30 });

    let saved = loadQuiz(quizId).questions.find((q) => q.id === question.id)!;
    equal(saved.prompt, "Why?");
    equal(saved.correct, 3);
    equal(saved.timeLimit, 30);
  });

  test("refuses a correct answer outside the four, and a silly time limit", () => {
    session.login({ userId: me, userName: "Host" });

    let question = addQuestion(createQuiz());

    assert(saveError({ ...question, correct: 4 }) !== "");
    assert(saveError({ ...question, timeLimit: 1 }) !== "");
    assert(saveError({ ...question, timeLimit: 600 }) !== "");
  });

  test("leaves another host's questions alone", () => {
    session.login({ userId: me, userName: "Host" });

    let quizId = createQuiz();
    let question = loadQuiz(quizId).questions[0];

    session.login({ userId: other, userName: "Other" });
    saveQuestion({ ...question, prompt: "hijacked" });
    deleteQuestion(question.id);

    let row = sql<{ prompt: string }>(`select prompt from questions where id = ${question.id}`).first();
    equal(row?.prompt, "");
  });
});
