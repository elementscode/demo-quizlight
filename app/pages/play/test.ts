import { test, assert, equal, sql, NotFoundError } from "@elements/app";
import { joinGame, playerByToken } from "#app/shared/services/game";

test("a player's page", () => {
  test("finds the player from the link token", () => {
    let user = sql<{ id: string }>(`
      insert into users (email, name, passwordHash) values ('h@example.com', 'Host', 'x') returning id
    `).firstOrThrow();

    let quiz = sql<{ id: string }>(`
      insert into quizzes (userId, title) values (${user.id}, 'Quiz') returning id
    `).firstOrThrow();

    sql(`insert into games (quizId, userId, code) values (${quiz.id}, ${user.id}, '222222')`);

    let player = playerByToken(joinGame({ code: "222222", nickname: "Grace" }));
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
