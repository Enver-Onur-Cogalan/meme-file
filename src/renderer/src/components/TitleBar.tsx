export function TitleBar(): React.JSX.Element {
  const isMac = window.api.platform === 'darwin'
  return (
    <div className="drag-region flex h-9 shrink-0 items-center bg-side">
      <div
        className={`flex items-center gap-2 text-[13px] font-extrabold ${isMac ? 'pl-20' : 'pl-3.5'}`}
      >
        <div className="size-[18px] -rotate-8 rounded-md border-[1.5px] border-text bg-sticker-yellow" />
        <span>meme file</span>
      </div>
    </div>
  )
}
