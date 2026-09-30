import { test, equal, session, sql } from "@elements/app";
import { advance, joinGame, watchGame } from "#app/shared/services/game";

test("the big screen", () => {
  let user = sql<{ id: string }>(`
    insert into users (email, name, passwordHash) values ('h@example.com', 'Host', 'x') returning id
  `).firstOrThrow();

  let quiz = sql<{ id: string }>(`
    insert into quizzes (userId, title) values (${user.id}, 'Quiz night') returning id
  `).firstOrThrow();

  sql(`insert into questions (quizId, prompt, answerA, answerB, answerC, answerD, correct) values (${quiz.id}, 'Q?', 'a', 'b', 'c', 'd', 1)`);

  let game = sql<{ id: string }>(`
    insert into games (quizId, userId, code) values (${quiz.id}, ${user.id}, '777777') returning id
  `).firstOrThrow();

  test("opens on the lobby with the code and everyone who joined", () => {
    joinGame({ code: "777777", nickname: "Ada" });

    let { state } = watchGame(game.id);

    equal(state.phase, "lobby");
    equal(state.code, "777777");
    equal(state.quizTitle, "Quiz night");
    equal(state.questionCount, 1);
    equal(state.players.map((p) => p.nickname), ["Ada"]);
  });

  test("past the last question the game finishes", () => {
    session.login({ userId: user.id, userName: "Host" });

    advance(game.id, "start", -1);
    advance(game.id, "close", 0);
    advance(game.id, "next", 0);

    equal(watchGame(game.id).state.phase, "finished");
  });
});
