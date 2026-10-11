"use client";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
/** Serialize writes so a failed request can never roll back a newer mutation. */
export function useOptimisticMutation<T>(
  read: () => T,
  write: (value: T) => void,
) {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const mutate = useCallback(
    async (optimistic: (value: T) => T, request: () => Promise<void>) => {
      if (lock.current) return false;
      lock.current = true;
      setPending(true);
      const snapshot = read();
      write(optimistic(snapshot));
      try {
        await request();
        return true;
      } catch (error) {
        write(snapshot);
        toast.error(
          error instanceof Error
            ? error.message
            : "Change could not be saved. Restored the previous state.",
        );
        return false;
      } finally {
        lock.current = false;
        setPending(false);
      }
    },
    [read, write],
  );
  return { mutate, pending };
}
