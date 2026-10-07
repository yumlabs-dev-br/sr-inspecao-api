import type { FotosRepository, Metricas } from "../repositories/fotos.repository.ts";

export class MetricasService {
  constructor(private readonly repo: FotosRepository) {}

  obter(): Metricas {
    return this.repo.metricas();
  }
}
