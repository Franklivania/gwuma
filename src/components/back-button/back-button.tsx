import { Button } from "@/components/button";
import { useNavigationStore } from "@/stores/navigation.store";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { MouseEvent } from "react";
import type { BackButtonProps } from "./back-button.types";

export function BackButton({
  addText = false,
  position = "left",
  label = "Back",
  iconSize = 16,
  variant = "plain",
  size,
  disabled,
  onBack,
  onClick,
  "aria-label": ariaLabel,
  ...rest
}: BackButtonProps) {
  const canGoBack = useNavigationStore((state) => state.viewHistory.length > 0);
  const pop = useNavigationStore((state) => state.pop);

  const resolvedSize = size ?? (addText ? "sm" : "icon");
  const iconPosition = position === "right" ? "end" : "start";
  const arrowIcon = position === "right" ? ArrowRight01Icon : ArrowLeft01Icon;

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!canGoBack) return;

    onClick?.(event);
    if (event.defaultPrevented) return;

    await onBack?.();
    pop();
  }

  return (
    <Button
      variant={variant}
      size={resolvedSize}
      icon={<HugeiconsIcon icon={arrowIcon} size={iconSize} />}
      iconPosition={addText ? iconPosition : "start"}
      disabled={disabled ?? !canGoBack}
      aria-label={ariaLabel ?? label}
      onClick={(event) => void handleClick(event)}
      {...rest}
    >
      {addText ? label : undefined}
    </Button>
  );
}
