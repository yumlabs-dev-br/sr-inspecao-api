/**
 * Onde ficam os BYTES das fotos (os metadados ficam no repositório). Na Etapa
 * 1 e 2, na memória; na Etapa 3, no object storage (SeaweedFS, que fala a
 * API do S3). Os serviços só conhecem esta interface.
 */
export interface Armazenamento {
  salvar(chave: string, dados: Uint8Array, tipo: string): Promise<void>;
  /** Os bytes e o tipo, ou null se a chave não existe. */
  ler(chave: string): Promise<{ dados: Uint8Array; tipo: string } | null>;
  apagar(chave: string): Promise<void>;
  /** Uma URL temporária para baixar o arquivo direto do armazenamento. */
  urlAssinada(chave: string, segundos: number): Promise<string>;
}
