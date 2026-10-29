CREATE TABLE "platform_social_links" (
    "id" TEXT NOT NULL,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "youtubeUrl" TEXT,
    "xUrl" TEXT,
    "whatsappUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_social_links_pkey" PRIMARY KEY ("id")
);
