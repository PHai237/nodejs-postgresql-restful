-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(255),
    "address" VARCHAR(255),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
