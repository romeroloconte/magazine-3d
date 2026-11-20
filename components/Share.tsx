"use client";

import { Check, Link2, LogIn, MessageCircle, Share2 } from "lucide-react";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* Buttons to share the current page. */
export function Share() {
  const [url, setUrl] = useState("");
  const [native, setNative] = useState(false);
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("magazine web");
  const pathname = usePathname();

  useEffect(() => {
    setUrl(location.href);
    setNative(typeof navigator.share === "function");
    const t = setTimeout(() => setText(document.title), 50);
    return () => clearTimeout(t);
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;
  const e = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const share = () => navigator.share({ title: document.title, url: location.href }).catch(() => {});

  return (
    <div className="share" aria-label="Share this page">
      {native && (
        <button onClick={share} aria-label="Share" title="Share">
          <Share2 size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
      <button onClick={copy} aria-label="Copy link" title={copied ? "Copied!" : "Copy link"}>
        {copied ? (
          <Check size={16} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Link2 size={16} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
      <a href={`https://wa.me/?text=${e(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="WhatsApp">
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden="true" />
      </a>
      {/* Sign in to the admin panel (if already signed in, it goes straight to the dashboard) */}
      <a href="/admin" className="share-login" aria-label="Sign in to the admin panel" title="Sign in">
        <LogIn size={16} strokeWidth={1.8} aria-hidden="true" />
      </a>
    </div>
  );
}
