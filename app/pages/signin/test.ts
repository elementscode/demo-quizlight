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
  // Test files run in parallel against one database; a fixed email would block
  // on another file's uncommitted row with the same unique key.
  let email = `host-${crypto.randomUUID().slice(0, 8)}@example.com`;

  // A cheap bcrypt cost keeps the test fast; the real signup uses 12.
  sql(`
    insert into users (email, name, passwordHash)
         values (${email}, 'Host', crypt('gamenight', genSalt('bf', 4)))
  `);

  test("signs a host in with the right password, whatever the email's case", () => {
    signin(` ${email.toUpperCase()} `, "gamenight");
    equal(session.get("userName"), "Host");
  });

  test("refuses a wrong password without saying which part was wrong", () => {
    let err = signinError(email, "nope");
    assert(err instanceof AuthError, `got ${err}`);
    equal((err as AuthError).message, "invalid email or password");
    equal(session.isLoggedIn(), false);
  });

  test("refuses an empty form", () => {
    assert(signinError("", "") instanceof AuthError);
  });
});
