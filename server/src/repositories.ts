import type {
  CategoryDocument,
  Locale,
  ProductDocument,
  SampleRequestDocument,
  OrderDocument,
} from "./domain/types.js";
import type { MongoDatabase } from "./mongo.js";

export type ProductListQuery = {
  locale: Locale;
  category?: string;
  search?: string;
  page: number;
  limit: number;
  sort: "newest" | "sku";
  featured?: boolean;
};

export type ProductListResult = {
  items: ProductDocument[];
  total: number;
};

export interface CatalogRepository {
  listProducts(query: ProductListQuery): Promise<ProductListResult>;
  findProductBySlug(slug: string): Promise<ProductDocument | null>;
  listCategories(): Promise<CategoryDocument[]>;
}

export interface SampleRequestRepository {
  create(document: SampleRequestDocument): Promise<void>;
}

export interface OrderRepository {
  create(document: OrderDocument): Promise<void>;
}

export type AppServices = {
  db?: MongoDatabase;
  databaseHealth: () => Promise<void>;
  catalog: CatalogRepository;
  sampleRequests: SampleRequestRepository;
  orders: OrderRepository;
};
