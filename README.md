![Quizlight, a live trivia game built with Elements: the big screen mid-question, with a countdown ring at 14 seconds, four colored answers and 5 of 9 players answered.](https://elements.dev/demos/01a0f392-374d-7ee9-b9ac-994b29ec987c/poster?v=87cecb996c64)

# Quizlight

> A demo app built with [Elements](https://elements.dev).

Hosts build quizzes and run them on a big screen. Players join from their phones with a code, race the countdown, and see their points and rank after every question.

**Demo:** [Quizlight](https://elements.dev/demos/01a0f392-374d-7ee9-b9ac-994b29ec987c/poster?v=87cecb996c64)

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
