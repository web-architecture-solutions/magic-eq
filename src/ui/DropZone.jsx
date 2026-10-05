import { useRef, useState } from "react";

export default function DropZone({ onFiles, compact }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const accept = (list) => {
    const files = Array.from(list).filter((f) => /\.(wav|wave|aif|aiff|flac|mp3|ogg|m4a)$/i.test(f.name));
    if (files.length) onFiles(files);
  };
  return (
    <div
      className={`dropzone${over ? " over" : ""}${compact ? " compact" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        accept(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".wav,.wave,.aif,.aiff,.flac,.mp3,.ogg,.m4a,audio/*"
        style={{ display: "none" }}
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
      {compact ? "Add stems" : "Drop stems here (WAV preferred), or click to choose files"}
    </div>
  );
}
