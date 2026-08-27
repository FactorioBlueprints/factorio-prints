import React from "react";
import Card from "react-bootstrap/Card";
import type { RawBlueprintData } from "../../schemas";
import LoadingIndicator from "../grid/LoadingIndicator";
import BlueprintContentHeader from "./BlueprintContentHeader";

interface BlueprintTitlesProps {
  blueprintKey: string;
  parsedData: RawBlueprintData | null | undefined;
  blueprintStringSha?: string;
  isLoading?: boolean;
}

function BlueprintTitles({
  blueprintKey,
  parsedData,
  blueprintStringSha,
  isLoading = false,
}: BlueprintTitlesProps) {
  if (isLoading) {
    return (
      <Card>
        <LoadingIndicator isLoading={isLoading} message="Loading blueprint titles" />
      </Card>
    );
  }

  if (!parsedData) {
    return null;
  }

  return (
    <BlueprintContentHeader
      data={parsedData}
      blueprintKey={blueprintKey}
      blueprintStringSha={blueprintStringSha}
    />
  );
}

export default BlueprintTitles;
