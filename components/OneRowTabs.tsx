"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fitTabs } from "@/lib/oneRowTabs";

/**
 * True on a phone inside the app. Screens shared with desktop use this to swap in the phone row, and
 * keep their own tabs elsewhere, including standalone pages that lack the app's styles.
 */
export function usePhoneTabs() {
  const [phone, setPhone] = useState(false);
  useLayoutEffect(() => {
    const query = window.matchMedia("(max-width: 1024px)"),
      sync = () => setPhone(query.matches && !!document.querySelector(".app-shell"));
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return phone;
}

export type OneRowTab = {
  id: string;
  label: string;
  /** What screen readers announce, when the label on screen is shortened. */
  fullName?: string;
  active?: boolean;
  /** Always stays in the row, such as Back. */
  pinned?: boolean;
  onSelect: () => void;
};

/**
 * The phone's single row of tabs. Shows as many as fit and puts the rest under More, so nothing wraps
 * onto a second line or hides behind sideways scrolling. It reuses the main menu's classes, so every
 * theme styles all these rows alike.
 */
export default function OneRowTabs({ tabs, label, navigation = false, sticky = false }: { tabs: OneRowTab[]; label: string; navigation?: boolean; sticky?: boolean }) {
  const root = useRef<HTMLElement | null>(null),
    measure = useRef<HTMLDivElement | null>(null),
    [shown, setShown] = useState<number[] | null>(null),
    [open, setOpen] = useState(false),
    signature = tabs.map((tab) => `${tab.id}:${tab.label}:${tab.active ? 1 : 0}:${tab.pinned ? 1 : 0}`).join("|");

  useLayoutEffect(() => {
    const rootEl = root.current,
      measureEl = measure.current;
    if (!rootEl || !measureEl) return;
    const update = () => {
      const style = getComputedStyle(rootEl),
        sizes = [...measureEl.children].map((el) => Math.ceil(el.getBoundingClientRect().width)),
        moreWidth = sizes.pop() ?? 0,
        available = rootEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        mustShow = tabs.flatMap((tab, index) => (tab.active || tab.pinned ? [index] : [])),
        next = fitTabs(sizes, available, moreWidth, parseFloat(style.columnGap) || 0, mustShow);
      setShown((current) => (current?.join() === next.join() ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rootEl);
    observer.observe(measureEl);
    return () => observer.disconnect();
    // The signature stands in for tabs, whose handlers are new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
        if (!root.current?.querySelector(".one-row-more")?.contains(event.target as Node)) setOpen(false);
      },
      escape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const visible = tabs.filter((_, index) => !shown || shown.includes(index)),
    hidden = tabs.filter((_, index) => shown && !shown.includes(index)),
    button = (tab: OneRowTab) => (
      <button
        key={tab.id}
        type="button"
        className={tab.active ? "active" : ""}
        aria-pressed={tab.active ? true : false}
        aria-label={tab.fullName}
        onClick={() => {
          setOpen(false);
          tab.onSelect();
        }}
      >
        <span>{tab.label}</span>
      </button>
    ),
    content = (
      <>
        {visible.map(button)}
        {hidden.length > 0 && (
          <div className="one-row-more">
            <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>
              <span>More ▾</span>
            </button>
            {open && <div className="one-row-more-menu">{hidden.map(button)}</div>}
          </div>
        )}
        <div ref={measure} className="one-row-measure" aria-hidden="true">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" tabIndex={-1}>
              <span>{tab.label}</span>
            </button>
          ))}
          <button type="button" tabIndex={-1}>
            <span>More ▾</span>
          </button>
        </div>
      </>
    ),
    className = `mobile-tabbar mobile-top-nav mobile-main-nav ${sticky ? "" : "one-row-inline"}`;

  return navigation ? (
    <nav ref={(el) => { root.current = el; }} className={className} aria-label={label}>
      {content}
    </nav>
  ) : (
    <div ref={(el) => { root.current = el; }} className={className} role="group" aria-label={label}>
      {content}
    </div>
  );
}
