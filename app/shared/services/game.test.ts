import { test, assert, equal, fatalf, session, sql, ValidationError, ForbiddenError } from "@elements/app";
import { advance, answer, joinGame, loadState, normalizeCode, ordinal, rankOf, timeUp, MAX_POINTS } from "./game";

interface Fixture {
  userId: string;
  gameId: string;
  code: string;
}

// Test files run in parallel against one database, so emails and live game
// codes, both unique, are random per fixture: two open transactions inserting
// the same key block each other.
function makeGame(): Fixture {
  let code = String(100000 + Math.floor(Math.random() * 900000));
  let user = sql<{ id: string }>(`
    insert into users (email, name, passwordHash)
         values (${`host-${crypto.randomUUID().slice(0, 8)}@example.com`}, 'Host', 'x')
      returning id
  `).firstOrThrow();

  let quiz = sql<{ id: string }>(`
    insert into quizzes (userId, title) values (${user.id}, 'Test quiz') returning id
  `).firstOrThrow();

  sql(`
    insert into questions (quizId, position, prompt, answerA, answerB, answerC, answerD, correct, timeLimit)
         values (${quiz.id}, 1, 'One?', 'a', 'b', 'c', 'd', 2, 20),
                (${quiz.id}, 2, 'Two?', 'a', 'b', 'c', 'd', 0, 10)
  `);

  let game = sql<{ id: string }>(`
    insert into games (quizId, userId, code) values (${quiz.id}, ${user.id}, ${code}) returning id
  `).firstOrThrow();

  return { userId: user.id, gameId: game.id, code };
}

function join(fx: Fixture, nickname: string): string {
  try {
    return joinGame({ code: fx.code, nickname });
  } catch (err) {
    fatalf("join %v failed: %v", nickname, (err as any)?.message);
    throw err;
  }
}

function joinError(code: string, nickname: string): Record<string, string[]> {
  try {
    joinGame({ code, nickname });
  } catch (err) {
    assert(err instanceof ValidationError, `got ${err}`);

    return (err as ValidationError).errors as Record<string, string[]>;
  }

  return {};
}

test("joining a game", () => {
  let fx = makeGame();

  test("adds the player to the lobby", () => {
    join(fx, "Ada");

    let state = loadState(fx.gameId);
    equal(state.phase, "lobby");
    equal(state.players.map((p) => p.nickname), ["Ada"]);
  });

  test("tolerates spaces in the code", () => {
    equal(normalizeCode(" 424 242 "), "424242");
  });

  test("refuses a code with no game", () => {
    assert(joinError("111111", "Ada").code !== undefined);
  });

  test("refuses a nickname already taken, whatever its case", () => {
    join(fx, "Grace");
    assert(joinError(fx.code, "grace").nickname !== undefined);
  });

  test("refuses a blank nickname", () => {
    assert(joinError(fx.code, "   ").nickname !== undefined);
  });
});

test("playing a question", () => {
  let fx = makeGame();
  let ada = join(fx, "Ada");
  let grace = join(fx, "Grace");

  // The session is fresh in every test body, so each one signs the host back in.
  let asHost = () => session.login({ userId: fx.userId, userName: "Host" });

  asHost();
  advance(fx.gameId, "start", -1);

  test("opens the first question without giving the answer away", () => {
    let state = loadState(fx.gameId);

    equal(state.phase, "question");
    equal(state.questionIndex, 0);
    equal(state.question?.prompt, "One?");
    equal(state.correct, null);
    equal(state.tally, null);
    assert((state.question?.remainingMs ?? 0) > 15000, `remaining ${state.question?.remainingMs}`);
  });

  test("keeps scores hidden until the question closes", () => {
    answer(ada, 0, 2);

    let state = loadState(fx.gameId);
    equal(state.phase, "question");
    equal(state.answeredCount, 1);
    equal(state.players.every((p) => p.score === 0 && p.correct === null), true);
  });

  test("counts only the first answer from a phone", () => {
    answer(ada, 0, 2);
    answer(ada, 0, 1);

    equal(sql<{ n: number }>(`select count(*)::int as n from answers where playerId in (select id from players where gameId = ${fx.gameId})`).firstOrThrow().n, 1);
  });

  test("closes as soon as everyone has answered, and scores it", () => {
    answer(ada, 0, 2);
    answer(grace, 0, 3);

    let state = loadState(fx.gameId);
    equal(state.phase, "reveal");
    equal(state.correct, 2);
    equal(state.tally, [0, 0, 1, 1]);

    let first = state.players[0];
    equal(first.nickname, "Ada");
    equal(first.correct, true);
    assert(first.score > MAX_POINTS / 2 && first.score <= MAX_POINTS, `score ${first.score}`);
    equal(first.gained, first.score);

    let second = state.players[1];
    equal(second.correct, false);
    equal(second.score, 0);
  });

  test("ignores an answer after the reveal", () => {
    asHost();
    answer(ada, 0, 2);
    advance(fx.gameId, "close", 0);
    answer(grace, 0, 2);

    equal(loadState(fx.gameId).players[1].score, 0);
  });

  test("scores a question once, however many close it", () => {
    asHost();
    answer(ada, 0, 2);
    answer(grace, 0, 3);

    let before = loadState(fx.gameId).players[0].score;
    advance(fx.gameId, "close", 0);
    timeUp(fx.gameId, 0);

    equal(loadState(fx.gameId).players[0].score, before);
  });

  test("the timer cannot close a question early", () => {
    asHost();
    answer(ada, 0, 2);
    timeUp(fx.gameId, 0);

    equal(loadState(fx.gameId).phase, "question");
  });

  test("moves through the leaderboard to the next question, then finishes", () => {
    asHost();
    answer(ada, 0, 2);
    answer(grace, 0, 3);

    advance(fx.gameId, "leaderboard", 0);
    equal(loadState(fx.gameId).phase, "leaderboard");

    advance(fx.gameId, "next", 0);
    let state = loadState(fx.gameId);
    equal(state.phase, "question");
    equal(state.questionIndex, 1);
    equal(state.players.every((p) => !p.answered), true);

    advance(fx.gameId, "close", 1);
    advance(fx.gameId, "next", 1);
    equal(loadState(fx.gameId).phase, "finished");
  });

  test("a stale button press from an earlier question does nothing", () => {
    asHost();
    answer(ada, 0, 2);
    answer(grace, 0, 3);
    advance(fx.gameId, "next", 0);
    advance(fx.gameId, "next", 0);

    equal(loadState(fx.gameId).questionIndex, 1);
  });
});

test("only the host runs their game", () => {
  let fx = makeGame();
  let other = sql<{ id: string }>(`
    insert into users (email, name, passwordHash) values (${`other-${crypto.randomUUID().slice(0, 8)}@example.com`}, 'Other', 'x') returning id
  `).firstOrThrow();

  session.login({ userId: other.id, userName: "Other" });

  let threw = false;

  try {
    advance(fx.gameId, "start", -1);
  } catch (err) {
    threw = true;
    assert(err instanceof ForbiddenError, `got ${err}`);
  }

  assert(threw);
  equal(loadState(fx.gameId).phase, "lobby");
});

test("ranks and ordinals", () => {
  let players = [
    { nickname: "a", score: 900, gained: 0, answered: false, correct: null },
    { nickname: "b", score: 900, gained: 0, answered: false, correct: null },
    { nickname: "c", score: 100, gained: 0, answered: false, correct: null },
  ];

  equal(rankOf(players, "b"), 1);
  equal(rankOf(players, "c"), 3);
  equal(rankOf(players, "nobody"), 0);
  equal([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
});
