import { NotFoundError, ValidationError, session, sql } from "@elements/app";

export interface QuizSummary {
  id: string;
  title: string;
  blurb: string;
  questionCount: number;
}

export interface Quiz {
  id: string;
  title: string;
  blurb: string;
}

export interface Question {
  id: string;
  prompt: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correct: number;
  timeLimit: number;
}

export const MIN_TIME = 5;
export const MAX_TIME = 120;

export function listQuizzes(): QuizSummary[] {
  return sql<QuizSummary>(`
    select q.id, q.title, q.blurb,
           (select count(*)::int from questions where quizId = q.id) as questionCount
      from quizzes q
     where q.userId = ${session.getOrThrow("userId")}
     order by q.createdAt
  `).all();
}

function ownQuizOrThrow(quizId: string): Quiz {
  return sql<Quiz>(`
    select id, title, blurb from quizzes
     where id = ${quizId} and userId = ${session.getOrThrow("userId")}
  `).firstOrThrow(new NotFoundError("that quiz does not exist"));
}

export function loadQuiz(quizId: string): { quiz: Quiz; questions: Question[] } {
  let quiz = ownQuizOrThrow(quizId);

  let questions = sql<Question>(`
    select id, prompt, answerA, answerB, answerC, answerD, correct, timeLimit
      from questions
     where quizId = ${quiz.id}
     order by position, createdAt
  `).all();

  return { quiz, questions };
}

/** @rpc */
export function createQuiz(): string {
  let quiz = sql<{ id: string }>(`
    insert into quizzes (userId, title)
         values (${session.getOrThrow("userId")}, 'Untitled quiz')
      returning id
  `).firstOrThrow();

  addQuestionTo(quiz.id);

  return quiz.id;
}

/** @rpc */
export function saveQuiz(quiz: Quiz) {
  let title = quiz.title.trim();

  if (!title) {
    throw new ValidationError("a quiz needs a title");
  }

  sql(`
    update quizzes
       set title = ${title}, blurb = ${quiz.blurb.trim()}
     where id = ${quiz.id} and userId = ${session.getOrThrow("userId")}
  `);
}

/** @rpc */
export function deleteQuiz(quizId: string) {
  ownQuizOrThrow(quizId);
  sql(`delete from quizzes where id = ${quizId}`);
}

function addQuestionTo(quizId: string): Question {
  return sql<Question>(`
    insert into questions (quizId, position)
         select ${quizId}, coalesce(max(position), 0) + 1 from questions where quizId = ${quizId}
      returning id, prompt, answerA, answerB, answerC, answerD, correct, timeLimit
  `).firstOrThrow();
}

/** @rpc */
export function addQuestion(quizId: string): Question {
  ownQuizOrThrow(quizId);

  return addQuestionTo(quizId);
}

/** @rpc */
export function saveQuestion(question: Question) {
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct > 3) {
    throw new ValidationError("mark one of the four answers correct");
  }

  let timeLimit = Math.round(Number(question.timeLimit));

  if (!(timeLimit >= MIN_TIME && timeLimit <= MAX_TIME)) {
    throw new ValidationError(`the time limit is ${MIN_TIME} to ${MAX_TIME} seconds`);
  }

  // The join is the ownership check: a question id from someone else's quiz updates nothing.
  sql(`
    update questions qn
       set prompt = ${question.prompt.trim()},
           answerA = ${question.answerA.trim()},
           answerB = ${question.answerB.trim()},
           answerC = ${question.answerC.trim()},
           answerD = ${question.answerD.trim()},
           correct = ${question.correct},
           timeLimit = ${timeLimit}
      from quizzes qz
     where qn.id = ${question.id}
       and qz.id = qn.quizId
       and qz.userId = ${session.getOrThrow("userId")}
  `);
}

/** @rpc */
export function deleteQuestion(questionId: string) {
  sql(`
    delete from questions qn
     using quizzes qz
     where qn.id = ${questionId}
       and qz.id = qn.quizId
       and qz.userId = ${session.getOrThrow("userId")}
  `);
}
