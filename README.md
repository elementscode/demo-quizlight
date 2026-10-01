![Quizlight, a live trivia game built with Elements: the big screen after a question, with the correct answer highlighted, a count of players on each answer and 5 of 8 who got it right.](https://elements.dev/demos/01a0f392-374d-7ee9-b9ac-994b29ec987c/poster?v=b086df8552bb)

# Quizlight

> A demo app built with [Elements](https://elements.dev).

Hosts build quizzes and run them on a big screen. Players join from their phones with a code, race the countdown, and see their points and rank after every question.

**Demo:** [Quizlight](https://elements.dev/demos/01a0f392-374d-7ee9-b9ac-994b29ec987c)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 21 min
- **Cost:** $6.21 at API rates, September 2026

## Get started

```bash
elements create quizlight -scaffold=elementscode/demo-quizlight
```

Sign in at `/signin` as the demo host and press **start game** on a quiz. The
big screen shows a six digit code. Open the home page on a phone (or another
browser window), type the code and a nickname, and you are in.

## How it's built

Quizlight needed a big screen and a room full of phones that move through each question together, a fair countdown, scoring and accounts for hosts. Each of those is a part of Elements, so the agent spent its 21 minutes on the game itself.

### What Elements gave the app

- **One game state for every screen.** A channel carries a snapshot of the game, and every join, answer and host action sends a fresh one, so the big screen and each phone redraw together. The answer and new scores join it when the question closes.
- **Players join from their phones.** A player types the six-digit code from the big screen and a nickname and gets their own game page. Nicknames are unique and a game holds up to 50 players.
- **Scoring timed on the server.** Each answer is timed in SQL from when the question opened, so points fall from 1,000 for an instant answer to 500 at the buzzer, with a short grace for the network. The question closes the moment the last player answers.
- **A countdown in step.** Each screen turns the server's remaining time into a local deadline once per question, so the phones and the big screen count down together.
- **Server calls as function calls.** The host's controls and the quiz editor call server functions straight from the page with `@rpc`.
- **Data and sessions from SQL.** Migrations define the game and seed a host login with three quizzes of ten questions each. Hosts sign in with a session, and each game's controls stay with the host who started it.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 31 tests pass. Every page works on desktop and phone.

## Seed data and demo account

The seed creates one host with three quizzes of ten questions each: Around the
World (geography), Silver Screen (movies) and Lab Coats On (science). The
sign-in page shows the login and has a button that signs in as the host.

| Email               | Password    | Role |
| ------------------- | ----------- | ---- |
| host@quizlight.test | `gamenight` | host |

Players do not have accounts. They join a running game with its code and a
nickname.

## The prompt

```text
Build a multiplayer trivia game named quizlight, for game nights.

HOST (accounts)
- Build quizzes: questions with four answers, one correct, and a time limit.
- Start a game, which shows a join code on the big screen.
- The big screen shows each question with a countdown, then the answer and
  how many picked each option, then the leaderboard.

PLAYER (no account, on a phone)
- Join with the code and a nickname.
- Tap an answer before time runs out. Faster correct answers score more.
- See whether they were right and their rank after each question.

Seed a host with three quizzes of ten questions each (geography, movies,
science). Show the host login on the sign-in page.

The whole game runs in real time across the big screen and every phone.
```

## License

MIT. See [LICENSE](LICENSE).
