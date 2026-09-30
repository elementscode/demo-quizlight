import { sql, session, AuthError } from "@elements/app";

export const MIN_PASSWORD = 8;

/** The seeded host, shown on the sign-in page so a game night can start straight away. */
export const DEMO_HOST = { email: "host@quizlight.test", password: "gamenight" };

interface User {
  id: string;
  name: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** @rpc */
export function signin(email: string, password: string) {
  let address = normalizeEmail(email);

  if (!address || !password) {
    throw new AuthError("enter your email and password");
  }

  let user = sql<User>(`
    select id, name from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("invalid email or password");
  }

  session.login({ userId: user.id, userName: user.name });
}

/** @rpc */
export function signup(name: string, email: string, password: string) {
  let address = normalizeEmail(email);
  let display = name.trim();

  if (!display) {
    throw new AuthError("tell us your name");
  }

  if (!isEmail(address)) {
    throw new AuthError("enter a valid email address");
  }

  if (password.length < MIN_PASSWORD) {
    throw new AuthError(`password must be at least ${MIN_PASSWORD} characters`);
  }

  let taken = !sql(`select 1 from users where email = ${address}`).empty();

  if (taken) {
    throw new AuthError("that email is already registered");
  }

  let user = sql<{ id: string }>(`
    insert into users (email, name, passwordHash)
         values (${address}, ${display}, crypt(${password}, genSalt('bf', 12)))
      returning id
  `).firstOrThrow();

  session.login({ userId: user.id, userName: display });
}
