type Props = {
  text: string;
};

export function Watermark({ text }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-center justify-center bg-black/60 py-2">
      <span className="text-sm font-medium text-white">{text}</span>
    </div>
  );
}
