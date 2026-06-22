-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollTheme" (
    "pollId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    CONSTRAINT "PollTheme_pkey" PRIMARY KEY ("pollId","themeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "Theme_slug_idx" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "PollTheme_pollId_idx" ON "PollTheme"("pollId");

-- CreateIndex
CREATE INDEX "PollTheme_themeId_idx" ON "PollTheme"("themeId");

-- CreateIndex
CREATE INDEX "Poll_createdAt_idx" ON "Poll"("createdAt");

-- AddForeignKey
ALTER TABLE "PollTheme" ADD CONSTRAINT "PollTheme_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTheme" ADD CONSTRAINT "PollTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default themes
INSERT INTO "Theme" ("id", "slug", "label", "createdAt") VALUES
    (gen_random_uuid()::text, 'relationship', 'Relationship', NOW()),
    (gen_random_uuid()::text, 'anime', 'Anime', NOW()),
    (gen_random_uuid()::text, 'movies', 'Movies', NOW())
ON CONFLICT ("slug") DO NOTHING;
