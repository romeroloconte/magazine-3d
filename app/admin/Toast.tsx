"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/* A short message after saving, then it removes ?saved from the address */
export function Toast({ message }: { message: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    history.replaceState(null, "", location.pathname);
    const t = setTimeout(() => setShown(false), 3500);
    return () => clearTimeout(t);
  }, []);
  if (!shown) return null;
  return <div className="toast" role="status"><Icon name="check" />{message}</div>;
}
