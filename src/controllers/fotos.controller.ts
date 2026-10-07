import type { Request, Response } from "express";
import { ehDestino } from "../domain/foto.ts";
import { ErroHttp } from "../http/erros.ts";
import { inteiro, inteiroDaQuery, objeto, texto } from "../http/validacao.ts";
import type { FotosService } from "../services/fotos.service.ts";

/**
 * Controller: traduz HTTP ↔ service. Lê e valida o pedido (helpers em
 * http/validacao.ts), chama o service e monta a resposta (status, corpo,
 * cabeçalhos). Erros: lance ErroHttp — o middleware responde {"erro": ...}.
 */
export class FotosController {
  constructor(private readonly service: FotosService) {}

  /** POST /fotos (multipart: foto, peca, lote, camera, segundos) — Etapa 1 (e a Idempotency-Key na Etapa 2). */
  criar = async (req: Request, res: Response) => {
    // O multer já leu o formulário: a foto em req.file e os campos em req.body.
    const { foto, repetida } = await this.service.receber({ arquivo: req.file, campos: req.body ?? {}, chave: req.get("idempotency-key") ?? undefined });
    // Pedido repetido (mesma Idempotency-Key) responde 200 com a mesma foto; foto nova, 201.
    res.status(repetida ? 200 : 201).location(`/fotos/${foto.id}`).json(foto);
  };

  /** GET /fotos?lote=&destino=&pagina=&por_pagina= — Etapa 1. */
  listar = (req: Request, res: Response) => {
    // TODO Etapa 1: destino (se vier) precisa ser válido (ehDestino) → senão 400; lote é texto.
    //   pagina com inteiroDaQuery(req.query.pagina, "pagina", 1, 1, 1000000)
    //   porPagina com inteiroDaQuery(req.query.por_pagina, "por_pagina", 20, 1, 100)
    //   res.json(this.service.listar({ lote, destino, pagina, porPagina }))
    void ehDestino;
    void inteiroDaQuery;
    void req;
    void res;
    throw new ErroHttp(501, "TODO Etapa 1: implemente GET /fotos (FotosController.listar)");
  };

  /** GET /fotos/:id — exemplo pronto. */
  buscar = (req: Request, res: Response) => {
    res.json(this.service.buscar(String(req.params.id)));
  };

  /** GET /fotos/:id/arquivo — Etapa 1: os bytes da foto, com o Content-Type dela. */
  arquivo = async (req: Request, res: Response) => {
    // TODO Etapa 1: const { dados, tipo } = await this.service.arquivo(id); res.type(tipo).send(Buffer.from(dados));
    void req;
    void res;
    throw new ErroHttp(501, "TODO Etapa 1: implemente GET /fotos/:id/arquivo (FotosController.arquivo)");
  };

  /** PATCH /fotos/:id {destino, supervisor, segundos} — Etapa 1: a revisão do supervisor. */
  revisar = (req: Request, res: Response) => {
    // TODO Etapa 1: corpo = objeto(req.body); destino com ehDestino (senão 400); supervisor com texto(...);
    //   segundos com inteiro(..., 0, 86400); res.json(this.service.revisar(id, destino, supervisor, segundos))
    void objeto;
    void texto;
    void inteiro;
    void req;
    void res;
    throw new ErroHttp(501, "TODO Etapa 1: implemente PATCH /fotos/:id (FotosController.revisar)");
  };

  /** GET /fotos/:id/url — Etapa 3: URL assinada do object storage. */
  url = async (req: Request, res: Response) => {
    // TODO Etapa 3: res.json(await this.service.url(id))
    void req;
    void res;
    throw new ErroHttp(501, "TODO Etapa 3: implemente GET /fotos/:id/url (FotosController.url)");
  };

  /** DELETE /fotos/:id — Etapa 3: apaga a foto (do bucket e do banco). */
  apagar = async (req: Request, res: Response) => {
    // TODO Etapa 3: await this.service.apagar(id); res.sendStatus(204)
    void req;
    void res;
    throw new ErroHttp(501, "TODO Etapa 3: implemente DELETE /fotos/:id (FotosController.apagar)");
  };
}
