import { Router } from "express";
import { FotosController } from "../controllers/fotos.controller.ts";
import { LotesController } from "../controllers/lotes.controller.ts";
import { MetricasController } from "../controllers/metricas.controller.ts";
import { limitarPorCamera } from "../http/limite.ts";
import { upload } from "../http/upload.ts";
import type { FotosRepository } from "../repositories/fotos.repository.ts";
import { DecisaoService } from "../services/decisao.service.ts";
import { FotosService } from "../services/fotos.service.ts";
import { LotesService } from "../services/lotes.service.ts";
import { MetricasService } from "../services/metricas.service.ts";
import type { Armazenamento } from "../storage/armazenamento.ts";

export interface Dependencias {
  repo: FotosRepository;
  armazenamento: Armazenamento;
  /** Etapa 4: fotos por minuto de cada câmera. */
  limitePorMinuto: number;
}

/** Monta as rotas ligando cada camada (rota → controller → service → repository/armazenamento). */
export function rotas({ repo, armazenamento, limitePorMinuto }: Dependencias): Router {
  const fotos = new FotosController(new FotosService(repo, armazenamento, new DecisaoService()));
  const lotes = new LotesController(new LotesService(repo));
  const metricas = new MetricasController(new MetricasService(repo));

  const r = Router();
  r.get("/saude", (_req, res) => {
    res.json({ ok: true });
  });

  r.post("/fotos", upload.single("foto"), limitarPorCamera(limitePorMinuto), fotos.criar);
  r.get("/fotos", fotos.listar);
  r.get("/fotos/:id", fotos.buscar);
  r.get("/fotos/:id/arquivo", fotos.arquivo);
  r.get("/fotos/:id/url", fotos.url);
  r.patch("/fotos/:id", fotos.revisar);
  r.delete("/fotos/:id", fotos.apagar);

  r.get("/lotes/:lote", lotes.resumo);
  r.get("/metricas", metricas.obter);
  return r;
}
