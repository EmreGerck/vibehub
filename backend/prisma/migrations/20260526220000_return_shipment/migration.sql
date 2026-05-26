-- CreateEnum
CREATE TYPE "ReturnShipmentStatus" AS ENUM ('INITIATED', 'DROPPED_OFF', 'IN_TRANSIT', 'ARRIVED_AT_DEPOT', 'COMPLETED');

-- CreateTable
CREATE TABLE "ReturnShipment" (
    "id"               TEXT NOT NULL,
    "orderId"          TEXT NOT NULL,
    "returnBarcode"    TEXT NOT NULL,
    "carrier"          TEXT NOT NULL DEFAULT 'aras',
    "status"           "ReturnShipmentStatus" NOT NULL DEFAULT 'INITIATED',
    "droppedOffAt"     TIMESTAMP(3),
    "arrivedAtDepotAt" TIMESTAMP(3),
    "adminNote"        TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnShipment_orderId_key" ON "ReturnShipment"("orderId");
CREATE UNIQUE INDEX "ReturnShipment_returnBarcode_key" ON "ReturnShipment"("returnBarcode");
CREATE INDEX "ReturnShipment_returnBarcode_idx" ON "ReturnShipment"("returnBarcode");

-- AddForeignKey
ALTER TABLE "ReturnShipment"
    ADD CONSTRAINT "ReturnShipment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
