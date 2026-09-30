import { ForbiddenError, Request, Response, redirect, session, sql } from "@elements/app";
import { watchGame } from "#app/shared/services/game";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let owned = !sql(`
    select 1 from games where id = ${req.params.id} and userId = ${session.getOrThrow("userId")}
  `).empty();

  if (!owned) {
    throw new ForbiddenError("this is not your game");
  }

  let { listener, state } = watchGame(req.params.id);

  return new html({ listener, state, joinHost: req.headers.host ?? "quizlight" });
}
