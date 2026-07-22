import { useState } from "react";
import {
  makeStudioV3LegacyPieceMapKey,
  type StudioV3Collection,
  type StudioV3Piece,
  type StudioV3Placement,
  type StudioV3SourceRef,
} from "@/lib/presence/studio-v3";

type ShelfTab = "pieces" | "collections" | "room" | "upload";
const SHELF_TABS: ReadonlyArray<{ id: ShelfTab; label: (counts: { pieces: number; collections: number; room: number }) => string }> = [
  { id: "pieces", label: (counts) => `Pieces ${counts.pieces}` },
  { id: "collections", label: (counts) => `Collections ${counts.collections}` },
  { id: "room", label: (counts) => `In this Room ${counts.room}` },
  { id: "upload", label: () => "Upload / Create" },
];
const sourceRefTestId = (prefix: "piece" | "collection", sourceRef: string) => (
  `presence-studio-v3-${prefix}-${sourceRef.replace(/[^a-z0-9-]+/gi, "-")}`
);
const pieceRuntimeIdentity = (piece: StudioV3Piece) => piece.roomId
  ? makeStudioV3LegacyPieceMapKey(piece.roomId, piece.id)
  : piece.sourceRef;

export default function StudioV3PieceShelf({
  pieces,
  collections,
  placements,
  activeRoomId,
  roomNativeObjectIds,
  activeRoomObjectIds,
  requiredCtaSourceRef,
  uploadEnabled,
  uploadReason,
  uploadBusy,
  libraryError,
  onInspect,
  onPlace,
  onUnplace,
  onPlaceCollection,
  onUnplaceCollection,
  onUpload,
}: {
  pieces: StudioV3Piece[];
  collections: StudioV3Collection[];
  placements: StudioV3Placement[];
  activeRoomId: string;
  roomNativeObjectIds: string[];
  activeRoomObjectIds: string[];
  requiredCtaSourceRef?: StudioV3SourceRef;
  uploadEnabled: boolean;
  uploadReason: string;
  uploadBusy: boolean;
  libraryError?: string | null;
  onInspect: (objectId: string, roomId?: string) => void;
  onPlace: (sourceRef: StudioV3SourceRef) => void;
  onUnplace: (objectId: string) => void;
  onPlaceCollection: (collection: StudioV3Collection) => void;
  onUnplaceCollection: (collection: StudioV3Collection) => void;
  onUpload: (file: File) => void;
}) {
  const [tab, setTab] = useState<ShelfTab>("pieces");
  const roomPieces = pieces.filter((piece) => piece.roomId !== undefined && roomNativeObjectIds.includes(piece.id));
  const activeRoomPieces = roomPieces.filter((piece) => piece.roomId === activeRoomId && activeRoomObjectIds.includes(piece.id));
  const canonicalPieces = pieces.filter((piece) => piece.sourceRef.startsWith("work:"));
  const visiblePlacements = placements.filter((placement) => placement.status === "placed" && placement.visibility !== "hidden");
  const retainedPlacements = placements.filter((placement) => placement.status !== "placed" || placement.visibility === "hidden");
  const placementFor = (sourceRef: StudioV3SourceRef) => visiblePlacements.find((placement) => placement.sourceRef === sourceRef)
    ?? retainedPlacements.find((placement) => placement.sourceRef === sourceRef);
  const counts = {
    pieces: canonicalPieces.length + roomPieces.length,
    collections: collections.length,
    room: activeRoomPieces.length + placements.length,
  };
  const firstActionableCollectionIndex = collections.findIndex((collection) => (
    placements.some((placement) => placement.collectionSourceRef === collection.sourceRef) ||
    (collection.sourceStatus === "current" && collection.memberSourceRefs.length > 0)
  ));
  return (
    <div className="studio-v3-library" data-testid="presence-studio-v3-piece-shelf">
      <header>
        <div>
          <p className="studio-v3-kicker">Pieces Library</p>
          <h2>Canonical sources, Room-native material</h2>
        </div>
        <p>Works and Collections are read from the owner Library. Room-native BBB Pieces remain clearly labelled and are never fabricated as Works.</p>
      </header>

      <div className="studio-v3-library-tabs" role="tablist" aria-label="Library views">
        {SHELF_TABS.map(({ id, label }, index) => (
          <button
            key={id}
            id={`studio-v3-library-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`studio-v3-library-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const nextIndex = event.key === "Home"
                ? 0
                : event.key === "End"
                  ? SHELF_TABS.length - 1
                  : (index + (event.key === "ArrowLeft" ? -1 : 1) + SHELF_TABS.length) % SHELF_TABS.length;
              const nextTab = SHELF_TABS[nextIndex]!.id;
              setTab(nextTab);
              const tabList = event.currentTarget.parentElement;
              const nextButton = tabList?.querySelector<HTMLButtonElement>(`#studio-v3-library-tab-${nextTab}`);
              nextButton?.focus();
            }}
          >
            {label(counts)}
          </button>
        ))}
      </div>

      <div className="studio-v3-library-summary" data-testid="presence-studio-v3-placement-summary" aria-live="polite">
        <strong>{visiblePlacements.length} placed</strong>
        <span>
          {placements.filter((placement) => placement.status === "duplicate").length} duplicate · {placements.filter((placement) => placement.status === "shelved" || placement.status === "incompatible").length} retained in Shelf
        </span>
      </div>

      {libraryError && <p className="studio-v3-inline-error" role="alert">{libraryError}</p>}

      {tab === "pieces" && (
        <div className="studio-v3-library-sections" role="tabpanel" id="studio-v3-library-panel-pieces" aria-labelledby="studio-v3-library-tab-pieces">
          <LibraryPieceGroup
            title="Canonical Works"
            empty="No canonical Works are available. No fallback Collection or duplicate Library has been invented."
            pieces={canonicalPieces}
            placementFor={placementFor}
            onInspect={onInspect}
            onPlace={onPlace}
            onUnplace={onUnplace}
            requiredCtaSourceRef={requiredCtaSourceRef}
          />
          <LibraryPieceGroup
            title="Room-native BBB Pieces"
            empty="No renderer-backed Pieces are present in this Room."
            pieces={roomPieces}
            placementFor={() => undefined}
            onInspect={(objectId, roomId) => onInspect(objectId, roomId)}
            onPlace={onPlace}
            onUnplace={onUnplace}
            roomNative
          />
        </div>
      )}

      {tab === "collections" && (
        <div className="studio-v3-library-grid" role="tabpanel" id="studio-v3-library-panel-collections" aria-labelledby="studio-v3-library-tab-collections" data-testid="presence-studio-v3-collections-library">
          {collections.length === 0 && <p className="studio-v3-empty-state">No canonical Collections are available. The Studio will not synthesize one.</p>}
          {collections.map((collection, index) => {
            const collectionPlacements = placements.filter((placement) => placement.collectionSourceRef === collection.sourceRef);
            const placed = collectionPlacements.some((placement) => placement.status === "placed" && placement.visibility !== "hidden");
            const retained = collectionPlacements.some((placement) => placement.status !== "placed" || placement.visibility === "hidden");
            const hasPlacement = placed || retained;
            const containsRequiredCta = Boolean(requiredCtaSourceRef && placements.some((placement) => (
              placement.collectionSourceRef === collection.sourceRef && placement.sourceRef === requiredCtaSourceRef
            )));
            const unavailable = collection.sourceStatus !== "current" || collection.memberSourceRefs.length === 0;
            const unavailableReason = collection.sourceStatus !== "current"
              ? "This Collection is missing or hidden in the canonical owner Library."
              : "This Collection has no canonical Work members to place.";
            return (
              <article
                key={collection.sourceRef}
                className="studio-v3-library-card"
                data-testid={sourceRefTestId("collection", collection.sourceRef)}
              >
                <span className="studio-v3-source-badge">Canonical Collection</span>
                <strong>{collection.title}</strong>
                <p>{collection.description || "No description"}</p>
                <small>{collection.memberSourceRefs.length} member Pieces</small>
                <button
                  type="button"
                  disabled={(unavailable && !hasPlacement) || containsRequiredCta}
                  title={containsRequiredCta
                    ? "This Collection contains the required navigation CTA and must remain placed."
                    : unavailable && !hasPlacement
                      ? unavailableReason
                      : hasPlacement
                        ? "Remove this Collection's placed and retained private Room entries."
                        : undefined}
                  onClick={() => hasPlacement ? onUnplaceCollection(collection) : onPlaceCollection(collection)}
                  data-testid={index === firstActionableCollectionIndex ? "presence-studio-v3-place-collection" : undefined}
                >
                  {placed ? "Unplace Collection" : retained ? "Remove retained Collection items" : unavailable ? "Unavailable" : "Place Collection"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {tab === "room" && (
        <div className="studio-v3-library-grid" role="tabpanel" id="studio-v3-library-panel-room" aria-labelledby="studio-v3-library-tab-room" data-testid="presence-studio-v3-room-inventory">
          {activeRoomPieces.map((piece) => (
            <RoomItem key={pieceRuntimeIdentity(piece)} piece={piece} objectId={piece.id} status="Room-native" onInspect={onInspect} />
          ))}
          {placements.map((placement) => {
            const piece = pieces.find((candidate) => (
              candidate.sourceRef === placement.sourceRef
              && (candidate.roomId === undefined || candidate.roomId === activeRoomId)
            ));
            const retained = placement.status !== "placed" || placement.visibility === "hidden";
            return piece ? <RoomItem
              key={placement.id}
              piece={piece}
              objectId={placement.id}
              status={retained ? `Retained: ${placement.status}` : "Placed from Library"}
              reason={retained ? placement.reason || "This entry is retained outside public-shaped output." : undefined}
              onInspect={onInspect}
              onRemove={retained ? () => onUnplace(placement.id) : undefined}
            /> : null;
          })}
        </div>
      )}

      {tab === "upload" && (
        <div className="studio-v3-upload-panel" role="tabpanel" id="studio-v3-library-panel-upload" aria-labelledby="studio-v3-library-tab-upload" data-testid="presence-studio-v3-library-upload-create">
          <article>
            <span className="studio-v3-source-badge">Owner-private media</span>
            <h3>Upload an image</h3>
            <p>Accepted: JPG, PNG, WEBP · maximum 8 MiB. Enabled only when protected draft storage is verified.</p>
            <label className={`studio-v3-upload-button${uploadEnabled ? "" : " is-disabled"}`}>
              <span>{uploadBusy ? "Uploading privately…" : "Choose image"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!uploadEnabled || uploadBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <small>{uploadEnabled ? "The upload enters private media inventory; it does not publish or rewrite a canonical Work." : uploadReason}</small>
          </article>
          <article className="is-disabled" aria-disabled="true">
            <span className="studio-v3-source-badge">Canonical Work</span>
            <h3>Create Work</h3>
            <p>Canonical Work creation is intentionally unavailable here because the current endpoint can change the live owner Library.</p>
            <button type="button" disabled>Create Work unavailable</button>
            <small>Use a reviewed Library-draft contract in a later gate. Visitor site unchanged.</small>
          </article>
        </div>
      )}
    </div>
  );
}

function LibraryPieceGroup({
  title,
  empty,
  pieces,
  placementFor,
  onInspect,
  onPlace,
  onUnplace,
  requiredCtaSourceRef,
  roomNative = false,
}: {
  title: string;
  empty: string;
  pieces: StudioV3Piece[];
  placementFor: (sourceRef: StudioV3SourceRef) => StudioV3Placement | undefined;
  onInspect: (objectId: string, roomId?: string) => void;
  onPlace: (sourceRef: StudioV3SourceRef) => void;
  onUnplace: (objectId: string) => void;
  requiredCtaSourceRef?: StudioV3SourceRef;
  roomNative?: boolean;
}) {
  const firstActionableIndex = pieces.findIndex((piece) => (
    Boolean(placementFor(piece.sourceRef)) || piece.sourceStatus === "current"
  ));
  return (
    <section>
      <h3>{title}</h3>
      {pieces.length === 0 && <p className="studio-v3-empty-state">{empty}</p>}
      <div className="studio-v3-library-grid">
        {pieces.map((piece, index) => {
          const placement = placementFor(piece.sourceRef);
          const unavailable = piece.sourceStatus !== "current";
          const requiredCta = Boolean(placement && requiredCtaSourceRef === piece.sourceRef);
          const retained = Boolean(placement && (placement.status !== "placed" || placement.visibility === "hidden"));
          const objectId = roomNative ? piece.id : placement?.id;
          return (
            <article
              key={pieceRuntimeIdentity(piece)}
              className="studio-v3-library-card"
              data-testid={sourceRefTestId("piece", pieceRuntimeIdentity(piece))}
            >
              {piece.media?.src ? (
                // eslint-disable-next-line @next/next/no-img-element -- canonical owner Library media can be remote.
                <img src={piece.media.src} alt="" />
              ) : <span className="studio-v3-library-placeholder" aria-hidden="true">Aa</span>}
              <span className="studio-v3-source-badge">{roomNative ? "Room-native Piece" : "Canonical Work"}</span>
              <strong>{piece.title}</strong>
              <p>{piece.description || piece.date || "No supporting detail"}</p>
              <small>{piece.mediaType} · {piece.sourceStatus}</small>
              <div>
                {objectId && <button type="button" onClick={() => onInspect(objectId, piece.roomId)}>Inspect / edit</button>}
                {!roomNative && (
                  <button
                    type="button"
                    disabled={(unavailable && !placement) || requiredCta}
                    title={requiredCta
                      ? "The required navigation CTA must remain placed."
                      : retained
                        ? placement?.reason || "Remove this retained entry from the private Shelf."
                      : unavailable && !placement
                        ? "Hidden or unavailable canonical Works cannot enter public-shaped output."
                        : placement
                          ? "Return this private placement to the Library."
                          : undefined}
                    onClick={() => placement ? onUnplace(placement.id) : onPlace(piece.sourceRef)}
                    data-testid={index === firstActionableIndex ? "presence-studio-v3-place-piece" : undefined}
                  >
                    {placement ? retained ? "Remove retained item" : "Unplace" : unavailable ? "Unavailable" : "Place in Room"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RoomItem({
  piece,
  objectId,
  status,
  reason,
  onInspect,
  onRemove,
}: {
  piece: StudioV3Piece;
  objectId: string;
  status: string;
  reason?: string;
  onInspect: (objectId: string, roomId?: string) => void;
  onRemove?: () => void;
}) {
  return (
    <article className="studio-v3-library-card">
      <span className="studio-v3-source-badge">{status}</span>
      <strong>{piece.title}</strong>
      <small>{piece.sourceRef}</small>
      {reason && <p>{reason}</p>}
      {onRemove
        ? <button type="button" onClick={onRemove}>Remove from Shelf</button>
        : <button type="button" onClick={() => onInspect(objectId, piece.roomId)}>Select on canvas</button>}
    </article>
  );
}
