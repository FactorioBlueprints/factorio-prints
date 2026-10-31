import { useStore } from "@tanstack/react-store";
import type React from "react";
import { useMemo } from "react";
import Form from "react-bootstrap/Form";
import type { SingleValue } from "react-select";

import ThemedSelect from "../ThemedSelect";
import { useEntityOptions } from "../../hooks/useEntityOptions";
import { advancedSearchStore, setEntity } from "../../store/advancedSearchStore";

interface EntityOption {
  value: string;
  label: string;
}

const EntityFilterSelect: React.FC = () => {
  const { data: entities, isLoading } = useEntityOptions();
  const entity = useStore(advancedSearchStore, (state) => state.entity);

  const options = useMemo(() => {
    return (entities ?? []).map((value) => ({
      value,
      label: value,
    }));
  }, [entities]);

  const selectedOption = entity ? { value: entity, label: entity } : null;

  const handleChange = (selected: SingleValue<EntityOption>): void => {
    setEntity(selected?.value ?? null);
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label>Entities</Form.Label>
      <ThemedSelect<EntityOption>
        size="sm"
        value={selectedOption}
        options={options}
        onChange={handleChange}
        isLoading={isLoading}
        isClearable={true}
        isSearchable={true}
        placeholder="Any entity"
      />
    </Form.Group>
  );
};

export default EntityFilterSelect;
