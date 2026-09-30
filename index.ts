import { App, redirect, session } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import signin from "#app/pages/signin";
import signup from "#app/pages/signup";
import quizzes from "#app/pages/quizzes";
import quizEdit from "#app/pages/quiz-edit";
import host from "#app/pages/host";
import play from "#app/pages/play";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/signup", signup);

app.route("/signout", () => {
  session.logout();
  redirect("/");
});

app.route("/quizzes", quizzes);
app.route("/quizzes/:id", quizEdit);
app.route("/host/:id", host);
app.route("/play/:token", play);

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
