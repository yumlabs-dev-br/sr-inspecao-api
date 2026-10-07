import type { RequestHandler } from "express";

/**
 * Limite de fotos por minuto de cada câmera (janela fixa de 60 s): uma câmera
 * com defeito que dispara sem parar não derruba o serviço das outras. Passou
 * do limite: 429 com o cabeçalho Retry-After (segundos até a janela virar).
 */
export function limitarPorCamera(porMinuto: number): RequestHandler {
  // TODO Etapa 4: um Map câmera → { inicio, n } (janela de 60 s, pelo Date.now()).
  //   A câmera vem em req.body.camera (o multer já leu o formulário).
  //   Passou de porMinuto na janela: res.set("Retry-After", segundos até a janela virar) e 429 {"erro": ...}.
  void porMinuto;
  return (_req, _res, next) => next();
}
