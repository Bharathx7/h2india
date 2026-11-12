-- Audit retention (step 3.6, decision A18: 8 years). The log stays append-only: UPDATE and TRUNCATE are always
-- refused. DELETE is allowed only for entries older than 8 years, and only inside the retention job, which sets
-- h2.audit_retention for its own transaction and writes an audit entry about what it removed.
CREATE OR REPLACE FUNCTION core.audit_log_is_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Nested so OLD is only read in the row-level DELETE trigger (it is null for the TRUNCATE statement trigger).
  IF TG_OP = 'DELETE' THEN
    IF current_setting('h2.audit_retention', true) = 'on' AND OLD.at < now() - interval '8 years' THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
