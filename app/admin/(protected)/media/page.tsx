// app/admin/(protected)/media/page.tsx — media asset management.
//
// Three tabs: Photos (AVATAR + COVER), Backgrounds (BACKGROUND), Documents (CV).
// Each group: list of uploaded assets with activate/delete, plus an upload form.
// Reuses setActiveMedia from app/lib/media.ts and the upload route handler.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { db } from "../../../../lib/db";
import { activateMediaAction, deleteMediaAction, addToSlotAction, removeFromSlotAction, deactivateMediaAction } from "./actions";
import { MediaUploadForm } from "./media-upload-form";
import { MediaTabs } from "./media-tabs";

export const metadata = { title: "Media · Admin" };

type Asset = {
  id: string;
  type: string;
  url: string;
  filename: string;
  isActive: boolean;
  slotOrder: number | null;
  version: number;
};

// Slot-type prefix map (mirrors media.ts SLOT_TYPES).
const SLOT_PREFIX: Record<string, string> = {
  AVATAR:           "image",
  COVER:            "cover",
  BACKGROUND:       "background",
  VIDEO_BACKGROUND: "video",
};

function AssetRow({
  asset,
  showImage,
  slottable = true,
}: {
  asset: Asset;
  showImage: boolean;
  slottable?: boolean;
}) {
  const isVideo = asset.type === "VIDEO_BACKGROUND";
  const prefix = SLOT_PREFIX[asset.type];
  const slotLabel = asset.slotOrder != null && prefix
    ? `${prefix}${asset.slotOrder}`
    : null;

  return (
    <div className={`media-asset-row${asset.isActive ? " media-asset-active" : ""}`}>
      {showImage && (
        <div className="media-thumb-wrap">
          {isVideo ? (
            <video
              src={`${asset.url}?v=${asset.version}`}
              className="media-thumb"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={`${asset.url}?v=${asset.version}`}
              alt={asset.filename}
              className="media-thumb"
            />
          )}
        </div>
      )}
      <div className="media-asset-info">
        <span className="media-filename">{asset.filename}</span>
        {asset.isActive && <span className="badge badge-published">Active</span>}
        {slotLabel && (
          <span className="badge badge-slot" title={`{{ profile.${slotLabel} }}`}>
            {`{{${slotLabel}}}`}
          </span>
        )}
      </div>
      <div className="row-actions">
        {asset.isActive ? (
          <form action={deactivateMediaAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="link-muted">Deactivate</button>
          </form>
        ) : (
          <form action={activateMediaAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="btn-primary">Activate</button>
          </form>
        )}
        {slottable && asset.slotOrder == null && (
          <form action={addToSlotAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="btn-secondary">+ Slot</button>
          </form>
        )}
        {slottable && asset.slotOrder != null && (
          <form action={removeFromSlotAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="link-muted">Remove from slot</button>
          </form>
        )}
        <form action={deleteMediaAction}>
          <input type="hidden" name="id" value={asset.id} />
          <button type="submit" className="link-danger">Delete</button>
        </form>
      </div>
    </div>
  );
}

function MediaGroup({
  label,
  hint,
  assets,
  uploadType,
  showImage = true,
  slottable = true,
}: {
  label: string;
  hint: string;
  assets: Asset[];
  uploadType: string;
  showImage?: boolean;
  slottable?: boolean;
}) {
  return (
    <div className="media-group">
      <h2 className="media-group-title">{label}</h2>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>{hint}</p>
      {assets.length === 0 ? (
        <p className="muted">No assets uploaded yet.</p>
      ) : (
        <div className="media-asset-list">
          {assets.map((a) => (
            <AssetRow key={a.id} asset={a} showImage={showImage} slottable={slottable} />
          ))}
        </div>
      )}
      <div className="media-upload-area">
        <MediaUploadForm type={uploadType} />
      </div>
    </div>
  );
}

export default async function MediaPage() {
  await requireAdmin();

  const all = await db.mediaAsset.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const byType = (type: string) => all.filter((a) => a.type === type);

  const avatars     = byType("AVATAR");
  const covers      = byType("COVER");
  const backgrounds = byType("BACKGROUND");
  const videoBackgrounds = byType("VIDEO_BACKGROUND");
  const cvs         = byType("CV");

  const photosPanel = (
    <div>
      <MediaGroup
        label="Avatar"
        hint="Your profile photo. Single-active: {{ profile.avatar }}. Use + Slot to also assign as image1, image2… for themes that reference multiple photos."
        assets={avatars}
        uploadType="AVATAR"
      />
      <MediaGroup
        label="Cover"
        hint="A cover or hero image. Single-active: {{ profile.cover }}. Slot as cover1, cover2… for multi-cover themes."
        assets={covers}
        uploadType="COVER"
      />
    </div>
  );

  const backgroundsPanel = (
    <div>
      <MediaGroup
        label="Background image"
        hint="Full-bleed static background. Single-active: {{ profile.background }}. Slot as background1, background2…"
        assets={backgrounds}
        uploadType="BACKGROUND"
      />
      <MediaGroup
        label="Video background"
        hint="Looping video background. Single-active: {{ profile.video_background }}. Slot as video1, video2… MP4, WebM, or Ogg — max 100 MB."
        assets={videoBackgrounds}
        uploadType="VIDEO_BACKGROUND"
      />
    </div>
  );

  const documentsPanel = (
    <MediaGroup
      label="CV / Résumé"
      hint="Your CV. Single-active: {{ profile.cv }}. PDF only, stored as-is. Documents don’t use slots."
      assets={cvs}
      uploadType="CV"
      showImage={false}
      slottable={false}
    />
  );

  return (
    <section className="content-page wide">
      <header className="content-head">
        <h1>Media</h1>
        <p>
          Upload-many-activate-one. The active asset of each type is what themes
          show via <code>{"{{ profile.avatar }}"}</code> etc.
        </p>
      </header>

      <MediaTabs
        photos={photosPanel}
        backgrounds={backgroundsPanel}
        documents={documentsPanel}
      />
    </section>
  );
}
