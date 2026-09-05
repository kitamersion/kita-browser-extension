import { Text, Box, HStack, VStack, Flex } from "@chakra-ui/react";
import React from "react";

interface SummaryItemProps {
  children: React.ReactNode;
  variant?: "compact" | "expanded";
  icon?: React.ElementType;
  highlight?: boolean;
}

const SummaryItem = ({ children, variant = "expanded", icon, highlight = false }: SummaryItemProps) => {
  if (variant === "compact") {
    return (
      <Box
        bg={highlight ? "kita.primaryAlpha.100" : "bg.secondary"}
        border="1px solid"
        borderColor={highlight ? "kita.border.accent" : "border.primary"}
        rounded="lg"
        p={3}
        transition="all 0.2s"
        _hover={{
          bg: "kita.primaryAlpha.100",
          borderColor: "kita.border.accent",
          transform: "translateY(-1px)",
        }}
      >
        {children}
      </Box>
    );
  }

  const childArray = React.Children.toArray(children);
  const titleChild = childArray.find((child) => React.isValidElement(child) && child.type === SummaryItem.Title);
  const valueChild = childArray.find((child) => React.isValidElement(child) && child.type === SummaryItem.Value);

  return (
    <Box
      bg={highlight ? "kita.primaryAlpha.100" : "bg.secondary"}
      border="1px solid"
      borderColor={highlight ? "kita.border.accent" : "border.primary"}
      rounded="2xl"
      p={6}
      boxShadow="dark-lg"
      transition="all 0.2s"
      _hover={{
        bg: "kita.primaryAlpha.100",
        borderColor: "kita.border.accent",
        transform: "translateY(-2px)",
        boxShadow: "2xl",
      }}
    >
      <VStack align="flex-start" spacing={3}>
        <Flex align="center" gap={2}>
          {icon && (
            <Flex align="center" justify="center" boxSize={8} bg="kita.primaryAlpha.200" color="accent.primary" rounded="lg" flexShrink={0}>
              <Box as={icon} boxSize={4} />
            </Flex>
          )}
          {titleChild}
        </Flex>
        {valueChild}
      </VStack>
    </Box>
  );
};

SummaryItem.Value = function SummaryItemValue({
  value,
  variant = "expanded",
}: {
  value: string | number;
  variant?: "compact" | "expanded";
}) {
  if (variant === "compact") {
    return (
      <Text fontSize="xl" fontWeight="bold" color="text.primary" lineHeight={1}>
        {value}
      </Text>
    );
  }

  return (
    <Text fontSize="3xl" fontWeight="bold" color="text.primary" lineHeight={1}>
      {value}
    </Text>
  );
};

SummaryItem.Title = function SummaryItemTitle({
  children,
  variant = "expanded",
}: {
  children: React.ReactNode;
  variant?: "compact" | "expanded";
}) {
  if (variant === "compact") {
    return (
      <Text fontSize="xs" color="accent.primary" fontWeight="medium" textTransform="uppercase" letterSpacing="wider" lineHeight={1}>
        {children}
      </Text>
    );
  }

  return (
    <Text fontSize="xs" color="text.secondary" fontWeight="medium" textTransform="uppercase" letterSpacing="wider">
      {children}
    </Text>
  );
};

// Compact layout component for popup
SummaryItem.Compact = function SummaryItemCompact({
  value,
  title,
  icon,
  highlight = false,
}: {
  value: string | number;
  title: string;
  icon?: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <SummaryItem variant="compact" highlight={highlight}>
      <HStack spacing={2} justify="space-between" w="full">
        <HStack spacing={2}>
          {icon && (
            <Flex align="center" justify="center" boxSize={5} bg="kita.primaryAlpha.200" color="accent.primary" rounded="md" flexShrink={0}>
              <Box as={icon} boxSize={3} />
            </Flex>
          )}
          <SummaryItem.Title variant="compact">{title}</SummaryItem.Title>
        </HStack>
        <SummaryItem.Value variant="compact" value={value} />
      </HStack>
    </SummaryItem>
  );
};

export default SummaryItem;
