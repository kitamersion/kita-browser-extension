const ENV = process.env.APPLICATION_ENVIRONMENT;

const getItemsFromKey = <T>(key: string): Promise<T | null> => {
  return new Promise((resolve, reject) => {
    try {
      if (ENV === "dev") {
        const items = localStorage.getItem(key);
        if (!items) {
          resolve(null);
        } else {
          console.log(`export items for key: ${key}`);
          const parsedItems = JSON.parse(items);
          resolve(parsedItems as T);
        }
      } else {
        chrome.storage.local.get(key, (data) => {
          const items: T = data?.[key] || null;
          console.log(`export items for key: ${key}`);
          resolve(items);
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

const exportToJSON = <T>(data: T, fileName: string): Promise<T | null> => {
  return new Promise((resolve, reject) => {
    try {
      console.log("exporting data...");
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      // cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

export { getItemsFromKey, exportToJSON };
