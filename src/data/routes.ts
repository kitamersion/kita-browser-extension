import React from "react";
const ToggleTheme = React.lazy(() => import("@/components/toggleTheme"));
const GitHub = React.lazy(() => import("@/components/github"));
const OpenExtensionButton = React.lazy(() => import("@/components/openExtensionButton"));

export const enum GlobalRouteKey {
  HOME = "HOME",
}

type IRouteKey = {
  [key in GlobalRouteKey]: string;
};

export const GlobalPath: IRouteKey = {
  HOME: "/home",
};

export type IRoute = {
  path: string;
  name: string;
  key: GlobalRouteKey;
  icon: React.ElementType;
  component: React.LazyExoticComponent<() => JSX.Element> | null;
};

// export const GlobalNavigation: Record<GlobalRouteKey, IRoute> = {
//   [GlobalRouteKey.GENERATOR]: {
//     name: "Generator",
//     path: GlobalPath.GENERATOR,
//     key: GlobalRouteKey.GENERATOR,
//     icon: SiAboutdotme,
//     component: ToggleGenerator,
//   },
// };

export const ActionItems = [{ component: ToggleTheme }, { component: GitHub }, { component: OpenExtensionButton }];
