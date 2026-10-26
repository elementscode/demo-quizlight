![A live trivia game with phone play, built by Claude Code on Elements: the big screen after a question, with the correct answer highlighted, a count of players on each answer and 5 of 8 who got it right.](https://elements.dev/demos/01a0f392-374d-7ee9-b9ac-994b29ec987c/poster?v=b086df8552bb)

# A live trivia game with phone play, built by Claude Code on Elements

> Quizlight is a full-stack app built with Claude Code on Elements.

Hosts build quizzes and run them on a big screen. Players join from their phones with a code, race the countdown, and see their points and rank after every question.

[Run this app on your machine](https://elements.dev/demos/01a0f392-374d-7ee9-b9ac-994b29ec987c). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

Sign in at `/signin` as the demo host and press **start game** on a quiz. The
big screen shows a six digit code. Open the home page on a phone (or another
browser window), type the code and a nickname, and you are in.

## How it's built

Quizlight needed a big screen and a room full of phones that move through each question together, a fair countdown, scoring and accounts for hosts. Each of those is a part of Elements, so the agent spent its 21 minutes on the game itself.

- **One game state for every screen.** A channel carries a snapshot of the game, and every join, answer and host action sends a fresh one, so the big screen and each phone redraw together. The answer and new scores join it when the question closes.

- **Players join from their phones.** A player types the six-digit code from the big screen and a nickname and gets their own game page. Nicknames are unique and a game holds up to 50 players.

- **Scoring timed on the server.** Each answer is timed in SQL from when the question opened, so points fall from 1,000 for an instant answer to 500 at the buzzer, with a short grace for the network. The question closes the moment the last player answers.

- **A countdown in step.** Each screen turns the server's remaining time into a local deadline once per question, so the phones and the big screen count down together.

- **Server calls as function calls.** The host's controls and the quiz editor call server functions straight from the page with `@rpc`.

- **Data and sessions from SQL.** Migrations define the game and seed a host login with three quizzes of ten questions each. Hosts sign in with a session, and each game's controls stay with the host who started it.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
