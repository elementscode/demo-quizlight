import { Request, Response } from "@elements/app";
import { playerByToken, watchGame } from "#app/shared/services/game";
import html from "./template";

export default function route(req: Request, res: Response) {
  let player = playerByToken(req.params.token);
  let { listener, state } = watchGame(player.gameId);

  return new html({ listener, state, token: req.params.token, nickname: player.nickname });
}
