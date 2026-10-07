import { ErroHttp } from "../http/erros.ts";
import type { FotosRepository, ResumoLote } from "../repositories/fotos.repository.ts";

export class LotesService {
  constructor(private readonly repo: FotosRepository) {}

  /** GET /lotes/:lote — Etapa 2: o relatório do lote. */
  resumo(lote: string): ResumoLote {
    // TODO Etapa 2: r = this.repo.resumoLote(lote); lote sem fotos (r.pecas === 0) → ErroHttp(404, ...); senão devolva r.
    void lote;
    throw new ErroHttp(501, "TODO Etapa 2: implemente LotesService.resumo()");
  }
}
