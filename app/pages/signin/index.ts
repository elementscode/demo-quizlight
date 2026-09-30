import { Request, Response, redirect, session } from "@elements/app";
import signin from "#app/pages/signin/template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/quizzes");
    return;
  }

  return new signin();
}
