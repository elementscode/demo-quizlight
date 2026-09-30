import { Request, Response, redirect, session } from "@elements/app";
import signup from "#app/pages/signup/template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/quizzes");
    return;
  }

  return new signup();
}
