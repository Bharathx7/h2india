// Search (step 5.2, ADR 0005): index definitions, documents, the outbox, queries and the zero-result log.
export { applyToIndex, ensureIndexes, indexName, replaceIndex, searchClient } from "./client";
export { companyDocuments, initialsOf } from "./companies";
export type { CompanyDocument } from "./companies";
export { findPriceField, PRODUCT_FIELDS, productDocument } from "./documents";
export { productSearchDocuments, queueProductsOf } from "./products";
export type { SearchDocument } from "./documents";
export {
  isSearchIndex,
  isSearchScope,
  PRICE_FIELD,
  SEARCH_INDEX_UIDS,
  SEARCH_INDEXES,
  SEARCH_SCOPES,
  SYNONYM_GROUPS,
  synonymsSetting,
} from "./indexes";
export type { IndexDefinition, SearchIndexUid, SearchScope } from "./indexes";
export { logSearchMiss } from "./misses";
export type { MissSource } from "./misses";
export { indexChangeSql, nudgeIndexer, pruneSearchOutbox, queueIndexChange, syncSearch } from "./outbox";
export type { DocumentLoader, SyncReport } from "./outbox";
export { cleanQuery, countMatches, filteredSearch, matchingRecords, MAX_QUERY, searchIndex, suggest } from "./query";
export type { SearchHit, SearchPage, Suggestions, SuggestionGroup } from "./query";
