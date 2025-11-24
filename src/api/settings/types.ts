export interface SettingDefinition<T = any> {
  key: string;
  defaultValue: T;
  validator?: (value: any) => value is T;
}

export interface SettingsGroup {
  [key: string]: SettingDefinition | SettingsGroup;
}

export type SettingValue<T extends SettingDefinition> = T extends SettingDefinition<infer U> ? U : never;

// Helper type to extract all setting definitions from a group
export type ExtractSettings<T> = T extends SettingDefinition
  ? T
  : T extends SettingsGroup
    ? { [K in keyof T]: ExtractSettings<T[K]> }
    : never;
