import { useEffect, useRef, useState } from "react";
import { useNavigationType } from "react-router-dom";

const canUseSessionStorage = () => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const readStoredValue = (storageKey, initialValue) => {
    if (!canUseSessionStorage()) {
        return typeof initialValue === "function" ? initialValue() : initialValue;
    }

    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
        return typeof initialValue === "function" ? initialValue() : initialValue;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return typeof initialValue === "function" ? initialValue() : initialValue;
    }
};

export function useSessionStorageState(storageKey, initialValue) {
    const [value, setValue] = useState(() => readStoredValue(storageKey, initialValue));

    useEffect(() => {
        if (!canUseSessionStorage()) return;
        try {
            window.sessionStorage.setItem(storageKey, JSON.stringify(value));
        } catch (err) {
            console.warn(`Failed to persist session state for ${storageKey}:`, err);
        }
    }, [storageKey, value]);

    return [value, setValue];
}

export function usePageScrollRestoration(storageKey, ready = true) {
    const navigationType = useNavigationType();
    const hasRestoredRef = useRef(false);

    useEffect(() => {
        if (!ready || hasRestoredRef.current || !canUseSessionStorage()) return;

        if (navigationType === "POP") {
            const raw = window.sessionStorage.getItem(`${storageKey}:scrollY`);
            const scrollY = raw ? Number.parseFloat(raw) : 0;

            if (Number.isFinite(scrollY) && scrollY > 0) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        window.scrollTo({ top: scrollY, behavior: "auto" });
                    });
                });
            }
        }

        hasRestoredRef.current = true;
    }, [navigationType, ready, storageKey]);

    useEffect(() => {
        if (!canUseSessionStorage()) return undefined;

        const saveScrollPosition = () => {
            try {
                window.sessionStorage.setItem(`${storageKey}:scrollY`, String(window.scrollY || 0));
            } catch (err) {
                console.warn(`Failed to persist scroll position for ${storageKey}:`, err);
            }
        };

        window.addEventListener("scroll", saveScrollPosition, { passive: true });

        return () => {
            saveScrollPosition();
            window.removeEventListener("scroll", saveScrollPosition);
        };
    }, [storageKey]);
}
