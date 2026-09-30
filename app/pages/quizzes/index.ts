import { Request, Response, redirect, session, sql } from "@elements/app";
import { listQuizzes } from "#app/shared/services/quizzes";
import html, { LiveGame } from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let live = sql<LiveGame>(`
    select g.id, g.code, q.title
      from games g
      join quizzes q on q.id = g.quizId
     where g.userId = ${session.getOrThrow("userId")}
       and g.phase <> 'finished'
     order by g.createdAt desc
  `).all();

  return new html({ quizzes: listQuizzes(), live });
}
