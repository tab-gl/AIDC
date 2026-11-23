import { useEffect, useId, useRef } from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

type Props = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

// Material 3 Expressive switch (m3e-switch) with a check and cross icon.
export function Toggle({ label, description, value, onChange, disabled }: Props) {
  const ref = useRef<HTMLElement & { checked?: boolean }>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => onChangeRef.current(Boolean(el.checked));
    el.addEventListener("change", handle);
    return () => el.removeEventListener("change", handle);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && el.checked !== value) el.checked = value;
  }, [value]);

  return (
    <HStack gap={4} vAlign="center" hAlign="between" width="100%">
      <StackItem size="fill">
        <VStack gap={1}>
          <Text id={`${id}-label`} weight="semibold">{label}</Text>
          {description && <Text type="supporting" color="secondary">{description}</Text>}
        </VStack>
      </StackItem>
      <m3e-switch ref={ref} icons="both" aria-labelledby={`${id}-label`} disabled={disabled || undefined} />
    </HStack>
  );
}
