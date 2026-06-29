// app/admin/(protected)/media/page.tsx — media asset management.
//
// Three tabs: Photos (AVATAR + COVER), Backgrounds (BACKGROUND), Documents (CV).
// Each group: list of uploaded assets with activate/delete, plus an upload form.
// Reuses setActiveMedia from app/lib/media.ts and the upload route handler.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { db } from "../../../../lib/db";
import { activateMediaAction, deleteMediaAction, addToSlotAction, removeFromSlotAction, deactivateMediaAction } from "./actions";
import {
  activateLinkAction,
  deactivateLinkAction,
  deleteLinkAction,
  addLinkToSlotAction,
  removeLinkFromSlotAction,
} from "./link-actions";
import { listLinks, type LinkAsset } from "../../../../lib/repos/link";
import { MediaUploadForm } from "./media-upload-form";
import { LinkAddForm } from "./link-add-form";
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
  CV:               "document",
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
            <button type="submit" className="btn-ghost btn-sm">Deactivate</button>
          </form>
        ) : (
          <form action={activateMediaAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="btn-secondary btn-sm">Activate</button>
          </form>
        )}
        {slottable && asset.slotOrder == null && (
          <form action={addToSlotAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="btn-secondary btn-sm">+ Slot</button>
          </form>
        )}
        {slottable && asset.slotOrder != null && (
          <form action={removeFromSlotAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="btn-ghost btn-sm">Remove from slot</button>
          </form>
        )}
        <form action={deleteMediaAction}>
          <input type="hidden" name="id" value={asset.id} />
          <button type="submit" className="btn-danger btn-sm">Delete</button>
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
      <div className="media-group-head">
        <h2 className="media-group-title">{label}</h2>
        <span className="media-group-count">
          {assets.length} {assets.length === 1 ? "file" : "files"}
        </span>
      </div>
      <p className="media-group-hint">{hint}</p>
      {assets.length === 0 ? (
        <p className="media-empty">No assets uploaded yet.</p>
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

// One external-link row. Mirrors AssetRow but for url/label data with its own
// activate/slot/delete actions. The slot label is link1, link2, ….
function LinkRow({ link }: { link: LinkAsset }) {
  const slotLabel = link.slotOrder != null ? `link${link.slotOrder}` : null;
  return (
    <div className={`media-asset-row${link.isActive ? " media-asset-active" : ""}`}>
      <div className="link-row-main">
        <span className="media-filename">{link.label}</span>
        <a className="link-row-url" href={link.url} target="_blank" rel="noopener noreferrer">
          {link.url}
        </a>
      </div>
      <div className="media-asset-info">
        {link.isActive && <span className="badge badge-published">Active</span>}
        {link.key && (
          <span className="badge badge-slot" title={`{{ profile.link_${link.key} }}`}>
            {`link_${link.key}`}
          </span>
        )}
        {slotLabel && (
          <span className="badge badge-slot" title={`{{ profile.${slotLabel} }}`}>
            {`{{${slotLabel}}}`}
          </span>
        )}
      </div>
      <div className="row-actions">
        {link.isActive ? (
          <form action={deactivateLinkAction}>
            <input type="hidden" name="id" value={link.id} />
            <button type="submit" className="btn-ghost btn-sm">Deactivate</button>
          </form>
        ) : (
          <form action={activateLinkAction}>
            <input type="hidden" name="id" value={link.id} />
            <button type="submit" className="btn-secondary btn-sm">Activate</button>
          </form>
        )}
        {link.slotOrder == null ? (
          <form action={addLinkToSlotAction}>
            <input type="hidden" name="id" value={link.id} />
            <button type="submit" className="btn-secondary btn-sm">+ Slot</button>
          </form>
        ) : (
          <form action={removeLinkFromSlotAction}>
            <input type="hidden" name="id" value={link.id} />
            <button type="submit" className="btn-ghost btn-sm">Remove from slot</button>
          </form>
        )}
        <form action={deleteLinkAction}>
          <input type="hidden" name="id" value={link.id} />
          <button type="submit" className="btn-danger btn-sm">Delete</button>
        </form>
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

  const links = await listLinks();

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
      hint="Your documents. Single-active: {{ profile.cv }}. Use + Slot to also assign as document1, document2… for themes that link multiple files (e.g. CV + portfolio PDF). PDF only, stored as-is."
      assets={cvs}
      uploadType="CV"
      showImage={false}
    />
  );

  // Links panel: same activate/slot pattern as media, but links are typed in
  // (LinkAddForm) rather than uploaded, and rows show url + label.
  const linksPanel = (
    <div className="media-group">
      <div className="media-group-head">
        <h2 className="media-group-title">External links</h2>
        <span className="media-group-count">
          {links.length} {links.length === 1 ? "link" : "links"}
        </span>
      </div>
      <p className="media-group-hint">
        Social profiles or any external URL. Give a link a <strong>key</strong>{" "}
        (e.g. <code>github</code>) to reference it by name in a theme:{" "}
        <code>{"{{ profile.link_github }}"}</code> +{" "}
        <code>{"{{ profile.link_github_label }}"}</code>. Or use + Slot for
        numbered links — <code>{"{{ profile.link1 }}"}</code> and the full list{" "}
        <code>{"{% for l in profile.links %}"}</code> with <code>l.url</code> /{" "}
        <code>l.label</code>. A link can have both a key and a slot.
      </p>
      {links.length === 0 ? (
        <p className="media-empty">No links added yet.</p>
      ) : (
        <div className="media-asset-list">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} />
          ))}
        </div>
      )}
      <div className="media-upload-area">
        <LinkAddForm />
      </div>
    </div>
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
        links={linksPanel}
      />
    </section>
  );
}
