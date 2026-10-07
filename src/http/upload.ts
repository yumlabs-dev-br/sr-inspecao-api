import multer from "multer";
import { ErroHttp } from "./erros.ts";

export const LIMITE_BYTES = 2 * 1024 * 1024;

/** O multer da rota de fotos: o arquivo fica na memória (req.file.buffer) e não passa de 2 MB. */
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITE_BYTES } });

/**
 * Etapa 1: o tipo pela ASSINATURA (os primeiros bytes) — o mimetype do pedido
 * é só o que o cliente diz. PNG começa com 89 50 4E 47; JPEG com FF D8 FF.
 */
export function tipoPelaAssinatura(b: Uint8Array): "image/png" | "image/jpeg" | null {
  // TODO Etapa 1: devolva "image/png", "image/jpeg" ou null olhando b[0], b[1], b[2], b[3].
  void b;
  throw new ErroHttp(501, "TODO Etapa 1: implemente tipoPelaAssinatura() (http/upload.ts)");
}

/**
 * Etapa 1: os erros do multer viram respostas HTTP. O tratarErros chama esta
 * função: devolva o ErroHttp certo, ou null se o erro não é do multer.
 */
export function erroDoMulter(err: unknown): ErroHttp | null {
  if (!(err instanceof multer.MulterError)) return null;
  // TODO Etapa 1: err.code === "LIMIT_FILE_SIZE" → ErroHttp(413, ...);
  //   qualquer outro (ex.: "LIMIT_UNEXPECTED_FILE", foto em outro campo) → ErroHttp(400, ...).
  return new ErroHttp(501, `TODO Etapa 1: trate o erro do multer ${err.code} (erroDoMulter em http/upload.ts)`);
}
