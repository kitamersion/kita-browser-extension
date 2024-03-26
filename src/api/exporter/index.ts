const ENV = process.env.APPLICATION_ENVIRONMENT;

const getItemsFromKey = <T>(key: string): Promise<T | null> => {
  return new Promise((resolve) => {
    if (ENV === "dev") {
      const items = localStorage.getItem(key);
      if (!items) {
        resolve(null);
      } else {
        console.log(`export items for key: ${key}`);
        resolve(items as T);
      }
    } else {
      chrome.storage.local.get(key, (data) => {
        const items: T = data?.[key] || null;
        console.log(`export items for key: ${key}`);
        resolve(items);
      });
    }
  });
};

const exportToJSON = <T>(data: T, fileName: string) => {
  console.log("exporting data...");
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
