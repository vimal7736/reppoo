import type { SyntheticEvent } from "react";

export function withAsyncDisabled<T extends (e: SyntheticEvent) => any>(handler: T) {
  return (e: SyntheticEvent) => {
    const el = e.currentTarget as unknown as { disabled?: boolean };
    if (el && el.disabled) return;

    const setDisabled = (v: boolean) => {
      try {
        if (el && typeof (el as any).disabled !== "undefined") {
          (el as any).disabled = v;
        }
      } catch (_) {
        // ignore
      }
    };

    try {
      setDisabled(true);
      const res = handler(e);
      if (res && typeof (res as any).then === "function") {
        return Promise.resolve(res).finally(() => setDisabled(false));
      }
      setDisabled(false);
      return res;
    } catch (err) {
      setDisabled(false);
      throw err;
    }
  };
}

export default withAsyncDisabled;
