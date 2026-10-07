import request from "supertest";
import { describe, expect, it } from "vitest";
import { appDeTeste, FOTO } from "./apoio.ts";

// Exemplos de teste de rota (passam quando a Etapa 1 estiver pronta).
// Na Etapa 4, escreva os seus: 415 pela assinatura, 409 na revisão, paginação,
// idempotência, relatório do lote, 429 por câmera...
describe("fotos", () => {
  it("POST /fotos cria com 201 e Location", async () => {
    const r = await request(appDeTeste())
      .post("/fotos")
      .attach("foto", FOTO, { filename: "peca.png", contentType: "image/png" })
      .field("peca", "P-1")
      .field("lote", "L-1")
      .field("camera", "cam-1")
      .field("segundos", "5");
    expect(r.status).toBe(201);
    expect(r.headers.location).toBe(`/fotos/${r.body.id}`);
    expect(r.body).toMatchObject({ peca: "P-1", lote: "L-1", tipo: "image/png", bytes: FOTO.length, revisada_em: null });
  });

  it("GET /saude responde", async () => {
    const r = await request(appDeTeste()).get("/saude");
    expect(r.body).toEqual({ ok: true });
  });
});
