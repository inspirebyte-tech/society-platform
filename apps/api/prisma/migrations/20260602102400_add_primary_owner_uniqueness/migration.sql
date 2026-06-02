CREATE UNIQUE INDEX "unique_active_primary_owner" ON "unit_ownerships" ("unitId") WHERE "isPrimary" = true AND "ownedUntil" IS NULL;
CREATE UNIQUE INDEX "unique_active_primary_occupant" ON "unit_occupancies" ("unitId") WHERE "isPrimary" = true AND "occupiedUntil" IS NULL;
