import { ErroHttp } from "./erros.ts";

/** Corpo do pedido como objeto (ou 400). */
export function objeto(corpo: unknown): Record<string, unknown> {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new ErroHttp(400, "envie um objeto JSON no corpo (Content-Type: application/json)");
  return corpo as Record<string, unknown>;
}

/** Texto não vazio (ou 400 com o nome do campo). */
export function texto(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || !valor.trim()) throw new ErroHttp(400, `falta o campo ${campo} (texto)`);
  return valor.trim();
}

/** Inteiro entre min e max (ou 400). Aceita texto ("15"), como chega num formulário multipart. */
export function inteiro(valor: unknown, campo: string, min: number, max: number): number {
  const n = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) throw new ErroHttp(400, `${campo} deve ser um inteiro de ${min} a ${max}`);
  return n;
}

/** Inteiro vindo da query string (?pagina=2), com padrão. */
export function inteiroDaQuery(valor: unknown, campo: string, padrao: number, min: number, max: number): number {
  if (valor === undefined) return padrao;
  const n = Number(valor);
  if (typeof valor !== "string" || valor.trim() === "" || !Number.isInteger(n) || n < min || n > max) throw new ErroHttp(400, `${campo} deve ser um inteiro de ${min} a ${max}`);
  return n;
}
