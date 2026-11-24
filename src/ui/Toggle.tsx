import { useId } from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Switch } from "./glisse";

type Props = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/**
 * glisse's iPhone-style switch: a glass thumb that stretches and refracts the track as it is
 * dragged or held, and springs to the new side. It exposes role="switch" and aria-checked, and
 * glisse honours prefers-reduced-motion, so the state change is instant for readers who ask
 * for less movement.
 */
export function Toggle({ label, description, value, onChange, disabled }: Props) {
  const id = useId();
  return (
    <HStack gap={4} vAlign="center" hAlign="between" width="100%">
      <StackItem size="fill">
        <VStack gap={1}>
          <Text id={`${id}-label`} weight="semibold">{label}</Text>
          {description && <Text id={`${id}-description`} type="supporting" color="secondary">{description}</Text>}
        </VStack>
      </StackItem>
      <Switch
        className="pref-switch"
        checked={value}
        onCheckedChange={onChange}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled || undefined}
      />
    </HStack>
  );
}
