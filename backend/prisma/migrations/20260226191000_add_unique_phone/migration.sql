DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'User_phone_key'
  ) THEN
    CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
  END IF;
END $$;
