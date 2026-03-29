type Props = {
  text: string;
};

export function Watermark({ text }: Props) {
  return (
    <div
      className="pointer-events-none mt-8 flex items-center justify-center rounded-lg bg-muted py-2.5"
      aria-hidden="true"
    >
      <span className="text-xs font-medium text-muted-foreground">{text}</span>
    </div>
  );
}
