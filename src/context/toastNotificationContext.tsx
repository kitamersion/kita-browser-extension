import { UseToastOptions, useToast as useChakraToast } from "@chakra-ui/react";
import React, { createContext, useContext } from "react";

const TOAST_RESET_DELAY_MS = 3000; // 3 seconds
const ENV = process.env.NODE_ENV;

type Status = "success" | "error" | "loading";

type IToast = {
  title: string;
  status: Status;
  description?: string;
  duration?: number | null;
};

interface ToastContextType {
  showToast: (toast: IToast) => void;
  showToastPromise: <T>(promise: Promise<T>, messages: { [status in Status]: IToast }) => Promise<T>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC = ({ children }) => {
  const chakraToast = useChakraToast();

  const showToast = ({ title, status, description, duration }: IToast) => {
    chakraToast({
      title: title,
      description: description,
      status: status,
      duration: duration ?? TOAST_RESET_DELAY_MS,
      isClosable: true,
      position: "bottom-left",
      variant: "solid",
    });
  };

  const showToastPromise = async (promise: Promise<any>, messages: { [status in Status]: IToast }) => {
    const loadingToast: UseToastOptions = {
      ...messages.loading,
      status: "loading",
      duration: null,
      position: "bottom-left",
      variant: "solid",
    };
    const loadingToastId = chakraToast(loadingToast);

    try {
      const data = await promise;
      chakraToast.close(loadingToastId);
      showToast(messages.success);
      return data;
    } catch (error) {
      chakraToast.close(loadingToastId);
      showToast(messages.error);
      throw error;
    }
  };

  return <ToastContext.Provider value={{ showToast, showToastPromise }}>{children}</ToastContext.Provider>;
};
