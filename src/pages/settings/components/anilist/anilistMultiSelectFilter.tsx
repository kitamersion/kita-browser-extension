import { Box, Button, Checkbox, CheckboxGroup, Input, Popover, PopoverBody, PopoverContent, PopoverTrigger, Text, VStack } from "@chakra-ui/react";
import React, { useMemo, useState } from "react";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export type AnilistMultiSelectFilterProps = {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
};

const AnilistMultiSelectFilter: React.FC<AnilistMultiSelectFilterProps> = ({ label, options, selectedValues, onChange }) => {
  const [filterText, setFilterText] = useState("");

  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(filterText.toLowerCase())),
    [options, filterText]
  );

  return (
    <Popover isLazy placement="bottom-start">
      <PopoverTrigger>
        <Button variant="kita-outline" size="sm" data-testid={`multiselect-${label}-trigger`}>
          {label}
          {selectedValues.length > 0 ? ` (${selectedValues.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent maxW="260px">
        <PopoverBody>
          <Input
            size="sm"
            mb={2}
            placeholder={`Search ${label.toLowerCase()}...`}
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            data-testid={`multiselect-${label}-search`}
          />
          <Box maxH="200px" overflowY="auto">
            {filteredOptions.length === 0 ? (
              <Text fontSize="sm" color="text.tertiary">
                No matches
              </Text>
            ) : (
              <CheckboxGroup value={selectedValues} onChange={(values) => onChange(values as string[])}>
                <VStack align="stretch" spacing={1}>
                  {filteredOptions.map((option) => (
                    <Checkbox key={option.value} value={option.value} data-testid={`multiselect-${label}-option-${option.value}`}>
                      {option.label}
                    </Checkbox>
                  ))}
                </VStack>
              </CheckboxGroup>
            )}
          </Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default AnilistMultiSelectFilter;
