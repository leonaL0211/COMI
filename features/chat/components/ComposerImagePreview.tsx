"use client";

type ComposerImagePreviewProps = {
  previewUrl: string;
  isDisabled: boolean;
  onRemove: () => void;
};

export function ComposerImagePreview({
  previewUrl,
  isDisabled,
  onRemove,
}: ComposerImagePreviewProps) {
  return (
    <div className="composer-image-preview">
      {/* Local object URL only — next/image can't optimize a blob: URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="composer-image-preview-thumb"
        src={previewUrl}
        alt="待发送图片预览"
      />
      <button
        className="composer-image-preview-remove"
        type="button"
        disabled={isDisabled}
        aria-label="移除待发送图片"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}
