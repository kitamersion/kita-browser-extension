import { Callback } from "@/types/callback";

const ENV = process.env.APPLICATION_ENVIRONMENT;

const getItemsFromKey = async <T>(key: string, callback: Callback<T | null>) => {
  if (ENV === "dev") {
    const items = localStorage.getItem(key);
    if (!items) {
      callback(null);
      return;
    }
    console.log(`export items for key: ${key}`);
    callback(items as T);
    return;
  }

  chrome.storage.local.get(key, (data) => {
    const items: T = data?.[key] || null;
    console.log(`export items for key: ${key}`);
    callback(items);
  });
};

const exportToJSON = <T>(data: T, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();

  // cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export { getItemsFromKey, exportToJSON };
