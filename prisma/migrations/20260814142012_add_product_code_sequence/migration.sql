-- Shared sequence backing generated SKU/barcode numeric suffixes.
-- Replaces the reference prototype's client-held `nextProductSequence`
-- counter (docs/BUSINESS_RULES.md §5) with a DB-safe, concurrency-proof
-- generator. Starting value is arbitrary; the dev seed script advances it
-- past whatever demo codes it inserts (docs/DATA_MIGRATION.md §5).
CREATE SEQUENCE IF NOT EXISTS product_code_seq START WITH 1000 INCREMENT BY 1;
