import type { Request, Response } from "express";
import type { LotesService } from "../services/lotes.service.ts";

export class LotesController {
  constructor(private readonly service: LotesService) {}

  resumo = (req: Request, res: Response) => {
    res.json(this.service.resumo(String(req.params.lote)));
  };
}
