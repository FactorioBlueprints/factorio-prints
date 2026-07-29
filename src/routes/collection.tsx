import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import MyCollectionGrid from "../components/MyCollectionGrid";
import ErrorBoundary from "../components/ErrorBoundary";

export const Route = createFileRoute("/collection")({
  component: CollectionComponent,
});

function CollectionComponent() {
  return (
    <ErrorBoundary>
      <MyCollectionGrid />
    </ErrorBoundary>
  );
}
