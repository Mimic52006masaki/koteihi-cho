import { useRef } from "react";

type Props = {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
};

export default function AmountInput({
  value,
  onChange,
  placeholder = "0",
  className = "border p-2 rounded w-full",
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={ref}
      type="number"
      value={value === 0 ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      onFocus={() => ref.current?.select()}
      placeholder={placeholder}
      className={className}
    />
  );
}
