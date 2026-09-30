import { test, equal, session, sql } from "@elements/app";
import { createQuiz, listQuizzes } from "#app/shared/services/quizzes";

function host(email: string): string {
  return sql<{ id: string }>(`
    insert into users (email, name, passwordHash) values (${email}, 'Host', 'x') returning id
  `).firstOrThrow().id;
}

test("quizzes", () => {
  test("lists only the signed-in host's quizzes, with their question counts", () => {
    let mine = host("me@example.com");
    let theirs = host("them@example.com");

    sql(`insert into quizzes (userId, title) values (${theirs}, 'Not mine')`);
    session.login({ userId: mine, userName: "Host" });

    let id = createQuiz();
    let quizzes = listQuizzes();

    equal(quizzes.map((q) => q.id), [id]);
    equal(quizzes[0].questionCount, 1);
  });
});
