import React from "react";
import { Alert, AlertIcon, Button, Text } from "@chakra-ui/react";

type KitaSyncPausedAlertProps = {
  onResume: () => void;
};

const KitaSyncPausedAlert: React.FC<KitaSyncPausedAlertProps> = ({ onResume }) => (
  <Alert status="warning" variant="kita" rounded="lg" fontSize="sm">
    <AlertIcon />
    <Text flex="1">Kita Sync is paused.</Text>
    <Button size="sm" variant="kita-outline" onClick={onResume}>
      Resume Kita Sync
    </Button>
  </Alert>
);

export default KitaSyncPausedAlert;
