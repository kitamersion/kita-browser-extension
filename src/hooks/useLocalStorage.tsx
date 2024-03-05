import { useState, useEffect, useRef } from "react";

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        return JSON.parse(storedValue);
      }
    } catch (error) {
      console.error(`Error reading from local storage for key '${key}':`, error);
    }
    return initialValue;
  });

  const updateTimeoutRef = useRef<number | undefined | NodeJS.Timeout>();

  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current as NodeJS.Timeout);
    }

    updateTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error writing to local storage for key '${key}':`, error);
      }
    }, 200);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current as NodeJS.Timeout);
      }
    };
  }, [key, value]);

  return [value, setValue];
}

export default useLocalStorage;
