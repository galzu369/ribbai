import * as React from "react";

import { cn } from "@/lib/utils";

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive";
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4 text-sm",
          variant === "destructive"
            ? "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
            : "bg-background text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

Alert.displayName = "Alert";

export type AlertDescriptionProps =
  React.HTMLAttributes<HTMLParagraphElement>;

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <p
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

