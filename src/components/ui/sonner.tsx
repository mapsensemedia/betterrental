import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast apple-toast group-[.toaster]:bg-card/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-full group-[.toaster]:px-5 group-[.toaster]:py-3",
          title: "group-[.toast]:font-medium group-[.toast]:text-sm",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:text-xs",
          success:
            "group-[.toaster]:!bg-card/80 group-[.toaster]:!text-foreground group-[.toaster]:border-success/20",
          error:
            "group-[.toaster]:!bg-card/80 group-[.toaster]:!text-foreground group-[.toaster]:border-destructive/20",
          warning:
            "group-[.toaster]:!bg-card/80 group-[.toaster]:!text-foreground group-[.toaster]:border-warning/20",
          info: "group-[.toaster]:!bg-card/80 group-[.toaster]:!text-foreground group-[.toaster]:border-accent/20",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-success" />,
        error: <AlertCircle className="h-4 w-4 text-destructive" />,
        warning: <AlertTriangle className="h-4 w-4 text-warning" />,
        info: <Info className="h-4 w-4 text-accent" />,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
