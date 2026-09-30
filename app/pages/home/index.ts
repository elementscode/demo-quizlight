import { Request, Response } from "@elements/app";
import { normalizeCode } from "#app/shared/services/game";
import html from "./template";

export default function route(req: Request, res: Response) {
  let code = typeof req.query.code === "string" ? normalizeCode(req.query.code).slice(0, 6) : "";

  return new html({ code });
}
