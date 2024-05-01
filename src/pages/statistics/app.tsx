import Application from "@/components/layouts/application";
import React from "react";
import { createRoot } from "react-dom/client";

const Statistics = React.lazy(() => import("@/pages/statistics/statistics"));

const App = () => {
  return (
    <Application>
      <Statistics />
    </Application>
  );
};

const root = createRoot(document.getElementById("statistics") as HTMLElement);
root.render(<App />);
