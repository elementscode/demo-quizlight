import { test, assert, equal, session, sql, AuthError } from "@elements/app";
import { signin } from "#app/shared/services/auth";

function signinError(email: string, password: string): unknown {
  try {
    signin(email, password);
  } catch (err) {
    return err;
  }

  return undefined;
}

test("signin", () => {
  // A cheap bcrypt cost keeps the test fast; the real signup uses 12.
  sql(`
    insert into users (email, name, passwordHash)
         values ('host@example.com', 'Host', crypt('gamenight', genSalt('bf', 4)))
  `);

  test("signs a host in with the right password, whatever the email's case", () => {
    signin(" Host@Example.com ", "gamenight");
    equal(session.get("userName"), "Host");
  });

  test("refuses a wrong password without saying which part was wrong", () => {
    let err = signinError("host@example.com", "nope");
    assert(err instanceof AuthError, `got ${err}`);
    equal((err as AuthError).message, "invalid email or password");
    equal(session.isLoggedIn(), false);
  });

  test("refuses an empty form", () => {
    assert(signinError("", "") instanceof AuthError);
  });
});
