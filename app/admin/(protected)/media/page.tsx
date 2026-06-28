// app/admin/(protected)/media/page.tsx — media asset management.
//
// Three tabs: Photos (AVATAR + COVER), Backgrounds (BACKGROUND), Documents (CV).
// Each group: list of uploaded assets with activate/delete, plus an upload form.
// Reuses setActiveMedia from app/lib/media.ts and the upload route handler.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { db } from "../../../../lib/db";
import { activateMediaAction, deleteMediaAction } from "./actions";
import { MediaUploadForm } from "./media-upload-form";
import { MediaTabs } from "./media-tabs";

export const metadata = { title: "Media · Admin" };

type Asset = {
  id: string;
  type: string;
  url: string;
  filename: string;
  isActive: boolean;
  version: number;
};

function AssetRow({ asset, showImage }: { asset: Asset; showImage: boolean }) {
  return (
    <div className={`media-asset-row${asset.isActive ? " media-asset-active" : ""}`}>
      {showImage && (
        <div className="media-thumb-wrap">
          <img
            src={`${asset.url}?v=${asset.version}`}
            alt={asset.filename}
            className="media-thumb"
          />
        </div>
      )}
      <div className="media-asset-info">
        <span className="media-filename">{asset.filename}</span>
        {asset.isActive && <span className="badge badge-published">Active</span>}
      </div>
      <div className="row-actions">
        {!asset.isActive && (
          <form action={activateMediaAction}>
            <input type="hidden" name="id" value={asset.id} />
            <button type="submit" className="btn-primary">Activate</button>
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
}: {
  label: string;
  hint: string;
  assets: Asset[];
  uploadType: string;
  showImage?: boolean;
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
            <AssetRow key={a.id} asset={a} showImage={showImage} />
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
  const cvs         = byType("CV");

  const photosPanel = (
    <div>
      <MediaGroup
        label="Avatar"
        hint="Your profile photo. Shown where themes use {{ profile.avatar }}. JPEG, PNG, or WebP — compressed to 400 px WebP on upload."
        assets={avatars}
        uploadType="AVATAR"
      />
      <MediaGroup
        label="Cover"
        hint="A cover or hero image. Shown where themes use {{ profile.cover }}. Compressed to 1200 px WebP."
        assets={covers}
        uploadType="COVER"
      />
    </div>
  );

  const backgroundsPanel = (
    <MediaGroup
      label="Background"
      hint="Full-bleed background image. Shown where themes use {{ profile.background }}. Compressed to 1600 px WebP."
      assets={backgrounds}
      uploadType="BACKGROUND"
    />
  );

  const documentsPanel = (
    <MediaGroup
      label="CV / Résumé"
      hint="Your CV. Shown where themes use {{ profile.cv }}. PDF only, stored as-is."
      assets={cvs}
      uploadType="CV"
      showImage={false}
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
