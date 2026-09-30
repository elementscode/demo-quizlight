import { test, assert, equal, sql, AuthError } from "@elements/app";
import { signup } from "#app/shared/services/auth";

function signupError(name: string, email: string, password: string): string {
  try {
    signup(name, email, password);
  } catch (err) {
    assert(err instanceof AuthError, `got ${err}`);

    return (err as AuthError).message;
  }

  return "";
}

test("signup", () => {
  test("needs a name, a real email and a long enough password", () => {
    equal(signupError("", "a@example.com", "longenough"), "tell us your name");
    equal(signupError("Ada", "not-an-email", "longenough"), "enter a valid email address");
    equal(signupError("Ada", "a@example.com", "short"), "password must be at least 8 characters");
  });

  test("refuses an email that is already registered", () => {
    let email = `a-${crypto.randomUUID().slice(0, 8)}@example.com`;
    sql(`insert into users (email, name, passwordHash) values (${email}, 'Ada', 'x')`);
    equal(signupError("Ada", email.toUpperCase(), "longenough"), "that email is already registered");
  });
});
