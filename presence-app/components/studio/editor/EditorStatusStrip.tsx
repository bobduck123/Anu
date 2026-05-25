"use client";

export function EditorStatusStrip({
  hasLiveRoom,
  hasSavedDraft,
  dirty,
  saving,
  publishing,
}: {
  hasLiveRoom: boolean;
  hasSavedDraft: boolean;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
}) {
  let message: string;
  if (publishing) {
    message = "Opening your room to visitors...";
  } else if (!hasLiveRoom) {
    message = "Not yet opened to visitors. Save and preview to see it as visitors will.";
  } else if (dirty) {
    message = "You are shaping the Draft room. Visitors still see the Live room. Save your changes when ready.";
  } else if (hasSavedDraft || saving) {
    message = "All changes saved. Visitors will not see them until you open the room.";
  } else {
    message = "Your Live room is up to date. Visitors see the room that is open now.";
  }

  return (
    <div
      data-testid="draft-live-status-strip"
      className="border-y border-[#d9d0c2] bg-[#efe8db] px-5 py-3 text-sm text-[#53493e] sm:px-7"
    >
      <span className="font-semibold text-[#29231d]">{dirty || hasSavedDraft ? "Draft room" : "Live room"}</span>
      <span className="mx-2 text-[#a68f70]">/</span>
      {message}
    </div>
  );
}
