-- CreateIndex
CREATE UNIQUE INDEX "unique_node_code" ON "property_nodes"("orgId", "parentId", "code");
