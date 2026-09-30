import { GameState } from "#app/shared/services/game";

/**
 * A countdown kept in the browser. Each screen turns the server's remaining
 * time into a local deadline once per question, so a phone whose clock is off
 * by a minute still counts down in step with the big screen.
 */
export interface Clock {
  now: number;
  deadline: number;
  key: string;
  timer: any;
}

export function newClock(): Clock {
  return { now: Date.now(), deadline: 0, key: "", timer: undefined };
}

export function syncClock(clock: Clock, state: GameState) {
  let key = `${state.phase}:${state.questionIndex}`;

  if (clock.key === key) {
    return;
  }

  clock.key = key;
  clock.now = Date.now();
  clock.deadline = state.phase === "question" && state.question ? clock.now + state.question.remainingMs : 0;
}

export function msLeft(clock: Clock): number {
  return Math.max(0, clock.deadline - clock.now);
}

export function secondsLeft(clock: Clock): number {
  return Math.ceil(msLeft(clock) / 1000);
}

/** How much of the bar is left, from 1 down to 0. */
export function fractionLeft(clock: Clock, state: GameState): number {
  if (!state.question || state.phase !== "question") {
    return 0;
  }

  return Math.min(1, msLeft(clock) / (state.question.timeLimit * 1000));
}

export interface Live {
  state: GameState;
}

/** Notifications can land out of order; the snapshot stamped later wins. */
export function applyState(live: Live, clock: Clock, state: GameState) {
  if (state.at < live.state.at) {
    return;
  }

  live.state = state;
  syncClock(clock, state);
}
