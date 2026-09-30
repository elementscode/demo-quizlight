import { Request, Response, redirect, session } from "@elements/app";
import { loadQuiz } from "#app/shared/services/quizzes";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let { quiz, questions } = loadQuiz(req.params.id);

  return new html({ quiz, questions });
}
