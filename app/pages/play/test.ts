import { test, assert, equal, sql, NotFoundError } from "@elements/app";
import { joinGame, playerByToken } from "#app/shared/services/game";

test("a player's page", () => {
  test("finds the player from the link token", () => {
    let user = sql<{ id: string }>(`
      insert into users (email, name, passwordHash) values (${`h-${crypto.randomUUID().slice(0, 8)}@example.com`}, 'Host', 'x') returning id
    `).firstOrThrow();

    let quiz = sql<{ id: string }>(`
      insert into quizzes (userId, title) values (${user.id}, 'Quiz') returning id
    `).firstOrThrow();

    let code = String(100000 + Math.floor(Math.random() * 900000));
    sql(`insert into games (quizId, userId, code) values (${quiz.id}, ${user.id}, ${code})`);

    let player = playerByToken(joinGame({ code, nickname: "Grace" }));
    equal(player.nickname, "Grace");
  });

  test("an unknown link is a not found", () => {
    try {
      playerByToken("nope");
      assert(false, "found a player for a bad token");
    } catch (err) {
      assert(err instanceof NotFoundError, `got ${err}`);
    }
  });
});
