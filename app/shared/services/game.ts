import {
  Channel,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  session,
  sql,
  tx,
} from "@elements/app";

export type Phase = "lobby" | "question" | "reveal" | "leaderboard" | "finished";

export const MAX_PLAYERS = 50;
export const MAX_NICKNAME = 16;

/** Points for an instant correct answer; a correct answer at the buzzer earns half. */
export const MAX_POINTS = 1000;

/** How late an answer may land after the deadline and still count, for the network. */
const GRACE_MS = 750;

export interface Standing {
  nickname: string;
  score: number;
  gained: number;
  answered: boolean;
  correct: boolean | null;
}

export interface LiveQuestion {
  prompt: string;
  answers: string[];
  timeLimit: number;
  remainingMs: number;
}

/**
 * Everything the big screen and every phone need to draw a game, sent whole on
 * each change. Nicknames rather than ids keep it well under the 8000 byte
 * notify limit at MAX_PLAYERS. What would give the answer away (the correct
 * option, the tally, who got it right, the new scores) stays out until the
 * question closes.
 */
export interface GameState {
  gameId: string;
  code: string;
  quizTitle: string;
  phase: Phase;
  questionIndex: number;
  questionCount: number;
  question: LiveQuestion | null;
  answeredCount: number;
  correct: number | null;
  tally: number[] | null;
  players: Standing[];
  at: number;
}

export const games = new Channel<GameState>("games");

interface GameRow {
  id: string;
  userId: string;
  quizId: string;
  code: string;
  phase: Phase;
  questionIndex: number;
  quizTitle: string;
  questionCount: number;
  remainingMs: number;
}

interface QuestionRow {
  id: string;
  prompt: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correct: number;
  timeLimit: number;
}

interface PlayerRow {
  nickname: string;
  score: number;
  choice: number | null;
  correct: boolean | null;
  points: number | null;
}

function loadGame(gameId: string): GameRow {
  return sql<GameRow>(`
    select g.id, g.userId, g.quizId, g.code, g.phase, g.questionIndex,
           q.title as quizTitle,
           (select count(*)::int from questions where quizId = g.quizId) as questionCount,
           greatest(0, (extract(epoch from (g.questionEndsAt - now())) * 1000))::int as remainingMs
      from games g
      join quizzes q on q.id = g.quizId
     where g.id = ${gameId}
  `).firstOrThrow(new NotFoundError("that game does not exist"));
}

function questionAt(quizId: string, index: number): QuestionRow | undefined {
  if (index < 0) {
    return undefined;
  }

  return sql<QuestionRow>(`
    select id, prompt, answerA, answerB, answerC, answerD, correct, timeLimit
      from questions
     where quizId = ${quizId}
     order by position, createdAt
    offset ${index}
     limit 1
  `).first();
}

/** Reads a game into the snapshot every screen renders. */
export function loadState(gameId: string): GameState {
  let game = loadGame(gameId);
  let question = questionAt(game.quizId, game.questionIndex);
  let closed = game.phase !== "lobby" && game.phase !== "question";

  let rows = sql<PlayerRow>(`
    select p.nickname, p.score, a.choice, a.correct, a.points
      from players p
      left join answers a on a.playerId = p.id and a.questionId = ${question?.id ?? null}
     where p.gameId = ${gameId}
     order by p.score desc, p.createdAt
  `).all();

  let tally: number[] | null = null;

  if (closed && question) {
    tally = [0, 0, 0, 0];

    for (let row of rows) {
      if (row.choice !== null) {
        tally[row.choice]++;
      }
    }
  }

  let players = rows.map((row): Standing => ({
    nickname: row.nickname,
    score: row.score,
    gained: closed ? row.points ?? 0 : 0,
    answered: row.choice !== null,
    correct: closed && question ? row.correct === true : null,
  }));

  return {
    gameId,
    code: game.code,
    quizTitle: game.quizTitle,
    phase: game.phase,
    questionIndex: game.questionIndex,
    questionCount: game.questionCount,
    question: question
      ? {
          prompt: question.prompt,
          answers: [question.answerA, question.answerB, question.answerC, question.answerD],
          timeLimit: question.timeLimit,
          remainingMs: game.phase === "question" ? game.remainingMs : 0,
        }
      : null,
    answeredCount: players.filter((p) => p.answered).length,
    correct: closed && question ? question.correct : null,
    tally,
    players,
    at: Date.now(),
  };
}

function broadcast(gameId: string) {
  games.notify(loadState(gameId));
}

/** Opens the subscription before reading, so no change between the two is lost. */
export function watchGame(gameId: string) {
  let listener = games.listen({ filter: (s) => s.gameId === gameId });
  let state = loadState(gameId);

  return { listener, state };
}

function ownGameOrThrow(gameId: string): GameRow {
  let game = loadGame(gameId);

  if (game.userId !== session.getOrThrow("userId")) {
    throw new ForbiddenError("this is not your game");
  }

  return game;
}

function newCode(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = String(Math.floor(100000 + Math.random() * 900000));
    let taken = !sql(`select 1 from games where code = ${code} and phase <> 'finished'`).empty();

    if (!taken) {
      return code;
    }
  }

  throw new Error("could not find a free game code");
}

/** @rpc */
export function startGame(quizId: string): string {
  let userId = session.getOrThrow("userId");

  let quiz = sql<{ id: string; questionCount: number }>(`
    select q.id, (select count(*)::int from questions where quizId = q.id) as questionCount
      from quizzes q
     where q.id = ${quizId} and q.userId = ${userId}
  `).firstOrThrow(new NotFoundError("that quiz does not exist"));

  if (quiz.questionCount === 0) {
    throw new ValidationError("add a question before you start a game");
  }

  let game = sql<{ id: string }>(`
    insert into games (quizId, userId, code)
         values (${quiz.id}, ${userId}, ${newCode()})
      returning id
  `).firstOrThrow();

  return game.id;
}

function openQuestion(game: GameRow, index: number) {
  let question = questionAt(game.quizId, index);

  if (!question) {
    sql(`update games set phase = 'finished' where id = ${game.id}`);
    return;
  }

  sql(`
    update games
       set phase = 'question',
           questionIndex = ${index},
           questionStartedAt = now(),
           questionEndsAt = now() + make_interval(secs => ${question.timeLimit})
     where id = ${game.id}
  `);
}

/**
 * Moves a question to its reveal once, however many callers race here: the
 * host's timer, the last player to answer, and the host's skip button.
 * Scores are only added now, so the leaderboard gives nothing away while the
 * question is open.
 */
function closeQuestion(gameId: string, index: number, early: boolean): boolean {
  return tx(() => {
    let closed = sql(`
      update games
         set phase = 'reveal'
       where id = ${gameId}
         and phase = 'question'
         and questionIndex = ${index}
         and (${early} or now() >= questionEndsAt - interval '300 milliseconds')
      returning id
    `).first();

    if (!closed) {
      return false;
    }

    sql(`
      update players p
         set score = p.score + a.points
        from answers a
        join games g on g.id = a.gameId
       where a.playerId = p.id
         and g.id = ${gameId}
         and a.questionId = (
           select q.id from questions q
            where q.quizId = g.quizId
            order by q.position, q.createdAt
           offset g.questionIndex
            limit 1
         )
    `);

    return true;
  });
}

export type HostAction = "start" | "close" | "leaderboard" | "next" | "end";

/** @rpc */
export function advance(gameId: string, action: HostAction, index: number) {
  let game = ownGameOrThrow(gameId);

  if (game.questionIndex !== index) {
    return;
  }

  switch (action) {
    case "start":
      if (game.phase === "lobby") {
        openQuestion(game, 0);
      }

      break;

    case "close":
      closeQuestion(gameId, index, true);
      break;

    case "leaderboard":
      if (game.phase === "reveal") {
        sql(`update games set phase = 'leaderboard' where id = ${gameId}`);
      }

      break;

    case "next":
      if (game.phase === "reveal" || game.phase === "leaderboard") {
        openQuestion(game, index + 1);
      }

      break;

    case "end":
      sql(`update games set phase = 'finished' where id = ${gameId}`);
      break;
  }

  broadcast(gameId);
}

/** @rpc */
export function timeUp(gameId: string, index: number) {
  ownGameOrThrow(gameId);

  if (closeQuestion(gameId, index, false)) {
    broadcast(gameId);
  }
}

export function normalizeCode(code: string): string {
  return code.replace(/\D/g, "");
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, " ");
}

export interface JoinForm {
  code: string;
  nickname: string;
}

/** @rpc */
export function joinGame(form: JoinForm): string {
  let code = normalizeCode(form.code);
  let nickname = normalizeNickname(form.nickname);

  if (code.length !== 6) {
    throw new ValidationError({ code: ["the code is the 6 digits on the big screen"] });
  }

  if (!nickname) {
    throw new ValidationError({ nickname: ["pick a nickname"] });
  }

  if (nickname.length > MAX_NICKNAME) {
    throw new ValidationError({ nickname: [`keep it to ${MAX_NICKNAME} characters`] });
  }

  let game = sql<{ id: string; players: number }>(`
    select g.id, (select count(*)::int from players where gameId = g.id) as players
      from games g
     where g.code = ${code} and g.phase <> 'finished'
  `).first();

  if (!game) {
    throw new ValidationError({ code: ["no game is running with that code"] });
  }

  if (game.players >= MAX_PLAYERS) {
    throw new ValidationError({ code: ["that game is full"] });
  }

  let player = sql<{ token: string }>(`
    insert into players (gameId, nickname)
         values (${game.id}, ${nickname})
    on conflict do nothing
      returning token
  `).first();

  if (!player) {
    throw new ValidationError({ nickname: ["someone already took that nickname"] });
  }

  broadcast(game.id);

  return player.token;
}

export interface Player {
  id: string;
  gameId: string;
  nickname: string;
}

export function playerByToken(token: string): Player {
  return sql<Player>(`
    select id, gameId, nickname from players where token = ${token}
  `).firstOrThrow(new NotFoundError("that player link is not in a game"));
}

/** @rpc */
export function answer(token: string, index: number, choice: number) {
  let player = playerByToken(token);

  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    throw new ValidationError("pick one of the four answers");
  }

  let game = loadGame(player.gameId);
  let question = questionAt(game.quizId, index);

  if (game.phase !== "question" || game.questionIndex !== index || !question) {
    return;
  }

  // Timing is measured on the server so a slow phone's clock can't help it.
  let saved = sql(`
    insert into answers (gameId, playerId, questionId, choice, correct, points, elapsedMs)
    select g.id, ${player.id}, ${question.id}, ${choice}, ${choice === question.correct},
           case when ${choice === question.correct}
                then round(${MAX_POINTS} * (1 - least(1, e.ms / (${question.timeLimit} * 1000.0)) / 2))::int
                else 0 end,
           e.ms
      from games g,
           lateral (select least(${question.timeLimit} * 1000,
                                 greatest(0, extract(epoch from (now() - g.questionStartedAt)) * 1000))::int as ms) e
     where g.id = ${game.id}
       and now() <= g.questionEndsAt + make_interval(secs => ${GRACE_MS / 1000})
    on conflict (playerId, questionId) do nothing
    returning id
  `).first();

  if (!saved) {
    return;
  }

  let waiting = sql<{ n: number }>(`
    select count(*)::int as n
      from players p
     where p.gameId = ${game.id}
       and not exists (select 1 from answers a where a.playerId = p.id and a.questionId = ${question.id})
  `).firstOrThrow();

  if (waiting.n === 0) {
    closeQuestion(game.id, index, true);
  }

  broadcast(game.id);
}

export function rankOf(players: Standing[], nickname: string): number {
  let me = players.find((p) => p.nickname === nickname);

  if (!me) {
    return 0;
  }

  let score = me.score;

  return players.filter((p) => p.score > score).length + 1;
}

export function ordinal(n: number): string {
  let tens = n % 100;

  if (tens >= 11 && tens <= 13) {
    return `${n}th`;
  }

  switch (n % 10) {
    case 1:
      return `${n}st`;

    case 2:
      return `${n}nd`;

    case 3:
      return `${n}rd`;

    default:
      return `${n}th`;
  }
}
