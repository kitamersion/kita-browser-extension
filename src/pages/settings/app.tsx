import Application from "@/components/layouts/application";
import React from "react";
import { createRoot } from "react-dom/client";

const Settings = React.lazy(() => import("@/pages/settings/settings"));

const App = () => {
  return (
    <Application>
      <Settings />
    </Application>
  );
};

const root = createRoot(document.getElementById("settings") as HTMLElement);
root.render(<App />);
