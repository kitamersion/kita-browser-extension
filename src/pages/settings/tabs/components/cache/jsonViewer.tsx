import React, { useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";

interface JsonViewerProps {
  value: unknown;
  name?: string;
  depth?: number;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ value, name, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(depth < 1);

  if (value === null || value === undefined || typeof value !== "object") {
    return (
      <HStack pl={depth * 4} spacing={1} data-testid="json-viewer-leaf">
        {name && (
          <Text color="text.secondary" fontSize="sm">
            {name}:
          </Text>
        )}
        <Text color="accent.primary" fontSize="sm" fontFamily="mono">
          {JSON.stringify(value)}
        </Text>
      </HStack>
    );
  }

  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);

  return (
    <Box pl={depth * 4}>
      <HStack spacing={1} cursor="pointer" onClick={() => setIsOpen((open) => !open)} data-testid="json-viewer-toggle">
        {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        <Text color="text.secondary" fontSize="sm">
          {name ? `${name}: ` : ""}
          {Array.isArray(value) ? `Array(${entries.length})` : `Object(${entries.length})`}
        </Text>
      </HStack>
      {isOpen && (
        <Box>
          {entries.map(([childName, childValue]) => (
            <JsonViewer key={childName} name={childName} value={childValue} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default JsonViewer;
