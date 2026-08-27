import React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import { FactorioIcon, Placeholder } from "../core/icons/FactorioIcon";
import { RichText } from "../core/text/RichText";
import type {
  RawBlueprintData,
  BlueprintBook,
  BlueprintContent,
  UpgradePlanner,
  DeconstructionPlanner,
  BlueprintIcon,
} from "../../schemas";

// The maintained fork of the blueprint editor; teoxoy's original is unmaintained.
const FBE_BASE_URL = "https://fbe.factorygamefan.com/";

/*
  The editor only passes an /api/ URL straight through to its cors proxy for
  factorio.school hostnames - factorioprints.xyz would be routed to the Firebase
  record for the whole book instead, which loses the position. Both hosts serve
  the same API, so link the one the editor understands.
*/
const BLUEPRINT_DATA_URL = "https://www.factorio.school/api/blueprintData";

interface BlueprintContentHeaderProps {
  data: RawBlueprintData;
  blueprintKey: string;
  blueprintStringSha?: string;
  positionArray?: number[];
}

function getBlueprintBook(
  data: BlueprintBook,
  blueprintKey: string,
  blueprintStringSha: string | undefined,
  positionArray: number[],
): React.ReactElement {
  const firstRow = getFirstRow(data);

  const { blueprints = [], active_index } = data;

  return (
    <>
      {firstRow}
      <Card>
        <ListGroup variant="flush">
          {blueprints.map((each, index) => (
            <ListGroup.Item key={index} active={index === active_index}>
              <BlueprintContentHeader
                data={each}
                blueprintKey={blueprintKey}
                blueprintStringSha={blueprintStringSha}
                positionArray={[...positionArray, index]}
              />
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
    </>
  );
}

function getEditorButton(positionArray: number[], blueprintStringSha: string): React.ReactElement {
  const position = positionArray.length === 0 ? "/" : `/position/${positionArray.join(".")}`;

  return (
    <Button
      type="button"
      href={`${FBE_BASE_URL}?source=${BLUEPRINT_DATA_URL}/${blueprintStringSha}${position}`}
      target="_blank"
      rel="noopener noreferrer"
      className="float-end"
      size="sm"
    >
      <img height="20px" width="20px" src="/icons/fbe.png" alt="" />
      <span className="p-1" />
      Open in editor
    </Button>
  );
}

function getBlueprint(
  data: BlueprintContent | UpgradePlanner | DeconstructionPlanner,
  blueprintStringSha: string | undefined,
  positionArray: number[],
): React.ReactElement {
  const { icons, item, label } = data;

  return (
    <>
      {item && (
        <>
          <FactorioIcon type="item" name={item} size="small" inline />
          <span className="p-1" />
        </>
      )}
      {icons &&
        Array.isArray(icons) &&
        [...Array(4).keys()].map((index) => getItemIconIfExists(icons, index))}
      <span className="p-1" />
      {label && <RichText text={label} inline iconSize="small" />}
      {blueprintStringSha && getEditorButton(positionArray, blueprintStringSha)}
    </>
  );
}

function BlueprintContentHeader({
  data,
  blueprintKey,
  blueprintStringSha,
  positionArray = [],
}: BlueprintContentHeaderProps): React.ReactElement | null {
  if (data.blueprint_book) {
    return getBlueprintBook(data.blueprint_book, blueprintKey, blueprintStringSha, positionArray);
  } else if (data.blueprint) {
    return getBlueprint(data.blueprint, blueprintStringSha, positionArray);
  } else if (data.deconstruction_planner) {
    return getBlueprint(data.deconstruction_planner, blueprintStringSha, positionArray);
  } else if (data.upgrade_planner) {
    return getBlueprint(data.upgrade_planner, blueprintStringSha, positionArray);
  } else {
    return null;
  }
}

function getFirstRow(data: BlueprintBook): React.ReactElement {
  const { icons, item, label } = data;

  return (
    <>
      {item && <FactorioIcon type="item" name={item} size="small" inline />}
      <span className="p-1" />
      {icons &&
        Array.isArray(icons) &&
        [...Array(4).keys()].map((index) => getItemIconIfExists(icons, index))}
      <span className="p-1" />
      {label && <RichText text={label} inline iconSize="small" />}
    </>
  );
}

function getItemIconIfExists(icons: BlueprintIcon[], index: number): React.ReactElement {
  if (index >= icons.length || !icons[index]) {
    return <Placeholder key={index} size="small" inline />;
  }

  const icon = icons[index];
  const signal = icon.signal;

  if (!signal || !signal.name) {
    return <Placeholder key={index} size="small" inline />;
  }

  return (
    <FactorioIcon
      key={index}
      name={signal.name}
      type={signal.type || "item"}
      quality={signal.quality}
      size="small"
      inline
    />
  );
}

export default BlueprintContentHeader;
