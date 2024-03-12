import Application from "@/components/layouts/application";
import React from "react";
import { createRoot } from "react-dom/client";

const PopUp = React.lazy(() => import("@/pages/popup/popup"));

const App = () => {
  return (
    <Application>
      <PopUp />
    </Application>
  );
};

const root = createRoot(document.getElementById("popup") as HTMLElement);
root.render(<App />);
