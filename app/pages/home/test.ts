import { test, assert, equal, sql, ValidationError } from "@elements/app";
import { joinGame } from "#app/shared/services/game";

test("joining from the home page", () => {
  let user = sql<{ id: string }>(`
    insert into users (email, name, passwordHash) values (${`h-${crypto.randomUUID().slice(0, 8)}@example.com`}, 'Host', 'x') returning id
  `).firstOrThrow();

  let quiz = sql<{ id: string }>(`
    insert into quizzes (userId, title) values (${user.id}, 'Quiz') returning id
  `).firstOrThrow();

  test("hands back the player's link token", () => {
    let code = String(100000 + Math.floor(Math.random() * 900000));
    sql(`insert into games (quizId, userId, code) values (${quiz.id}, ${user.id}, ${code})`);

    let token = joinGame({ code: `${code.slice(0, 3)} ${code.slice(3)}`, nickname: "  Ada   Lovelace " });

    equal(token.length, 32);
    equal(sql<{ nickname: string }>(`select nickname from players where token = ${token}`).firstOrThrow().nickname, "Ada Lovelace");
  });

  test("a finished game's code no longer lets anyone in", () => {
    let code = String(100000 + Math.floor(Math.random() * 900000));
    sql(`insert into games (quizId, userId, code, phase) values (${quiz.id}, ${user.id}, ${code}, 'finished')`);

    try {
      joinGame({ code, nickname: "Ada" });
      assert(false, "joined a finished game");
    } catch (err) {
      assert(err instanceof ValidationError, `got ${err}`);
    }
  });
});
