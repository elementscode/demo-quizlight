-- create quizlight schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  passwordHash text not null
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table quizzes (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users (id) on delete cascade,
  title text not null,
  blurb text not null default ''
);

create index quizzesUserId on quizzes (userId);

create trigger quizzesTouchUpdatedAt
  before update on quizzes
  for each row execute function touchUpdatedAt();

create table questions (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  quizId uuid not null references quizzes (id) on delete cascade,
  position integer not null default 0,
  prompt text not null default '',
  answerA text not null default '',
  answerB text not null default '',
  answerC text not null default '',
  answerD text not null default '',
  correct smallint not null default 0 check (correct between 0 and 3),
  timeLimit integer not null default 20 check (timeLimit between 5 and 120)
);

create index questionsQuizId on questions (quizId, position);

create trigger questionsTouchUpdatedAt
  before update on questions
  for each row execute function touchUpdatedAt();

create table games (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  quizId uuid not null references quizzes (id) on delete cascade,
  userId uuid not null references users (id) on delete cascade,
  code text not null,
  phase text not null default 'lobby'
    check (phase in ('lobby', 'question', 'reveal', 'leaderboard', 'finished')),
  questionIndex integer not null default -1,
  questionStartedAt timestamptz,
  questionEndsAt timestamptz
);

-- A code only has to be unique among games still running, so codes recycle.
create unique index gamesLiveCode on games (code) where phase <> 'finished';

create trigger gamesTouchUpdatedAt
  before update on games
  for each row execute function touchUpdatedAt();

create table players (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  gameId uuid not null references games (id) on delete cascade,
  nickname text not null,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  score integer not null default 0
);

create unique index playersNickname on players (gameId, lower(nickname));

create trigger playersTouchUpdatedAt
  before update on players
  for each row execute function touchUpdatedAt();

create table answers (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  gameId uuid not null references games (id) on delete cascade,
  playerId uuid not null references players (id) on delete cascade,
  questionId uuid not null references questions (id) on delete cascade,
  choice smallint not null check (choice between 0 and 3),
  correct boolean not null,
  points integer not null default 0,
  elapsedMs integer not null,
  unique (playerId, questionId)
);

create index answersGameQuestion on answers (gameId, questionId);

create trigger answersTouchUpdatedAt
  before update on answers
  for each row execute function touchUpdatedAt();
