import { ErroHttp } from "../http/erros.ts";
import type { Armazenamento } from "./armazenamento.ts";

/** Fotos na memória do servidor (pronto): somem quando ele reinicia. */
export class MemoriaArmazenamento implements Armazenamento {
  private arquivos = new Map<string, { dados: Uint8Array; tipo: string }>();

  async salvar(chave: string, dados: Uint8Array, tipo: string) {
    this.arquivos.set(chave, { dados, tipo });
  }

  async ler(chave: string) {
    return this.arquivos.get(chave) ?? null;
  }

  async apagar(chave: string) {
    this.arquivos.delete(chave);
  }

  /** Na memória não há URL de verdade: só o object storage assina URLs (Etapa 3). */
  async urlAssinada(): Promise<string> {
    throw new ErroHttp(501, "URL assinada só existe com o object storage (Etapa 3: S3Armazenamento)");
  }
}
