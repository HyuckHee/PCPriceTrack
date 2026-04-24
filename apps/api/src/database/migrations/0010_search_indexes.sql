CREATE INDEX IF NOT EXISTS idx_products_specs_gin ON products USING GIN (specs);
CREATE INDEX IF NOT EXISTS idx_products_specs_cores ON products (((specs->>'cores')::int)) WHERE specs->>'cores' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_specs_vram ON products (((specs->>'vram')::int)) WHERE specs->>'vram' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_specs_capacity ON products (((specs->>'capacity')::int)) WHERE specs->>'capacity' IS NOT NULL;
