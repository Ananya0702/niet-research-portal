import { useEffect, useRef, useState } from "react";

export default function OtpInput({ length = 6, onChange, disabled = false }) {
  const [values, setValues] = useState(Array(length).fill(""));
  const refs = useRef([]);

  const reset = () => {
    setValues(Array(length).fill(""));
    refs.current[0]?.focus();
  };

  // Expose reset programmatically
  useEffect(() => {
    if (onChange) onChange({ values, complete: values.every(v => v), reset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const handleChange = (idx, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[idx] = digit;
    setValues(next);
    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (values[idx]) {
        const next = [...values];
        next[idx] = "";
        setValues(next);
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    const next = Array(length).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setValues(next);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          value={v}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          inputMode="numeric"
          maxLength={1}
          autoComplete="one-time-code"
          style={{
            width: 52, height: 60, fontSize: 24, fontWeight: 700,
            textAlign: "center", color: "#1a1a1a",
            border: v ? "2px solid #534AB7" : "2px solid #e5e5e5",
            borderRadius: 10, outline: "none", background: "#fafafa",
            transition: "border-color 0.15s",
          }}
        />
      ))}
    </div>
  );
}