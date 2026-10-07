import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ErroHttp } from "../http/erros.ts";
import type { Armazenamento } from "./armazenamento.ts";

export interface ConfigS3 {
  endpoint: string;
  bucket: string;
  chave: string;
  segredo: string;
}

/**
 * Fotos no object storage (SeaweedFS, compatível com S3) — Etapa 3. O cliente
 * e a criação do bucket já estão prontos; cada operação é um comando do SDK
 * (@aws-sdk/client-s3).
 */
export class S3Armazenamento implements Armazenamento {
  private readonly s3: S3Client;

  constructor(private readonly config: ConfigS3) {
    this.s3 = new S3Client({
      endpoint: config.endpoint,
      region: "us-east-1",
      forcePathStyle: true, // http://localhost:8333/<bucket>/<chave>
      credentials: { accessKeyId: config.chave, secretAccessKey: config.segredo },
    });
  }

  /** Cria o bucket se ainda não existir (chamado ao subir o servidor). */
  async garantirBucket() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.config.bucket }));
    }
  }

  /** Etapa 3: PutObjectCommand com Bucket, Key, Body e ContentType. */
  async salvar(chave: string, dados: Uint8Array, tipo: string) {
    // TODO Etapa 3: await this.s3.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: chave, Body: dados, ContentType: tipo }))
    void PutObjectCommand;
    void chave;
    void dados;
    void tipo;
    throw new ErroHttp(501, "TODO Etapa 3: implemente salvar() no S3Armazenamento");
  }

  /** Etapa 3: GetObjectCommand — os bytes (Body.transformToByteArray()) e o ContentType; chave que não existe (NoSuchKey) → null. */
  async ler(chave: string): Promise<{ dados: Uint8Array; tipo: string } | null> {
    // TODO Etapa 3
    void GetObjectCommand;
    void chave;
    throw new ErroHttp(501, "TODO Etapa 3: implemente ler() no S3Armazenamento");
  }

  /** Etapa 3: DeleteObjectCommand. */
  async apagar(chave: string) {
    // TODO Etapa 3
    void DeleteObjectCommand;
    void chave;
    throw new ErroHttp(501, "TODO Etapa 3: implemente apagar() no S3Armazenamento");
  }

  /** Etapa 3: getSignedUrl(this.s3, new GetObjectCommand({ Bucket, Key }), { expiresIn: segundos }). */
  async urlAssinada(chave: string, segundos: number): Promise<string> {
    // TODO Etapa 3
    void getSignedUrl;
    void chave;
    void segundos;
    throw new ErroHttp(501, "TODO Etapa 3: implemente urlAssinada() no S3Armazenamento");
  }
}
