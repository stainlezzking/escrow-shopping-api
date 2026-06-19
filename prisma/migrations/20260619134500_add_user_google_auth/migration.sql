-- Add nullable Google identity link for optional Google signup/signin.
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- Multiple NULL values are allowed in PostgreSQL unique indexes, so local-only users remain valid.
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
