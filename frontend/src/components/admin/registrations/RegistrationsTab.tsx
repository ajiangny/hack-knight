// Registrations admin tab — read-only, which makes it structurally unlike the
// other four. There is no staged draft state, so no SaveBar and no DiffModal;
// it reports 0 dirty changes once on mount to satisfy the tab contract and
// keep the unsaved-changes dot from ever appearing.

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiDownload } from "../../../lib/api";
import { useRegistrations } from "../../../hooks/useRegistrations";
import type { Registration } from "../../../types";
import { XIcon } from "../icons";
import { EmptyState, Modal, Panel } from "../ui";

function formatDate(value: string | undefined) {
  const d = new Date(value ?? NaN);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RegistrationsTab({
  onDirtyChange,
}: {
  onDirtyChange?: (count: number) => void;
}) {
  const { registrations, loading, error, refetch } = useRegistrations();
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Read-only tab: never dirty.
  useEffect(() => {
    onDirtyChange?.(0);
  }, [onDirtyChange]);

  // Filtered in the browser: at this volume it beats a request per keystroke.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return registrations;
    return registrations.filter((r) =>
      [
        r.firstName,
        r.lastName,
        r.email,
        r.phone,
        r.school,
        r.levelOfStudy,
        r.country,
        r.major,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [registrations, search]);

  // The export route is behind auth, so a plain href would 401. Fetch it with
  // the auth header and hand the browser a blob instead.
  async function handleExport() {
    setActionError(null);
    setExporting(true);
    let url: string | null = null;
    try {
      const blob = await apiDownload("/registrations/export");
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hackknight-registrations-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.click();
    } catch (err) {
      setActionError(`Export failed: ${(err as Error).message}`);
    } finally {
      // Revoked here rather than through useObjectUrls: that hook is built for
      // previews that must outlive the call, while this URL is dead the moment
      // the download starts.
      if (url) URL.revokeObjectURL(url);
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await apiDelete(`/registrations/${pendingDelete.id}`);
      setPendingDelete(null);
      await refetch();
    } catch (err) {
      setActionError(`Delete failed: ${(err as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {error && <p className="admin-error">{error}</p>}
      {actionError && <p className="admin-error">{actionError}</p>}

      <Panel
        title="Registrations"
        count={loading ? "…" : registrations.length}
        actions={
          <button
            type="button"
            className="admin-btn-ghost"
            onClick={handleExport}
            disabled={exporting || registrations.length === 0}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        }
      >
        <div className="mb-4">
          <label className="admin-label" htmlFor="registration-search">
            Search
          </label>
          <input
            id="registration-search"
            className="admin-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone, school, or major"
          />
        </div>

        {loading ? (
          <EmptyState>Loading registrations…</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>
            {registrations.length === 0
              ? "No registrations yet."
              : `No registrations match “${search.trim()}”.`}
          </EmptyState>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Age</th>
                    <th scope="col">School</th>
                    <th scope="col">Level of Study</th>
                    <th scope="col">Country</th>
                    <th scope="col">Major</th>
                    <th scope="col">Gender</th>
                    <th scope="col">Pronouns</th>
                    <th scope="col">Race / Ethnicity</th>
                    <th scope="col">Orientation</th>
                    <th scope="col">Dietary</th>
                    <th scope="col">LinkedIn</th>
                    {/* The first two MLH boxes are always Yes (the API rejects
                        registrations without them); they get columns anyway so
                        every submitted field is visible here, matching the
                        CSV export. */}
                    <th scope="col">MLH Conduct</th>
                    <th scope="col">MLH Sharing</th>
                    <th scope="col">MLH Emails</th>
                    <th scope="col">Resume</th>
                    <th scope="col">Registered</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">
                        {r.firstName} {r.lastName}
                      </td>
                      {/* select-all so one click grabs the whole address */}
                      <td className="select-all font-mono text-xs">{r.email}</td>
                      <td className="whitespace-nowrap font-mono text-xs">
                        {r.phone}
                      </td>
                      <td>{r.age}</td>
                      <td>{r.school}</td>
                      <td>{r.levelOfStudy}</td>
                      <td className="whitespace-nowrap">{r.country}</td>
                      <td>{r.major}</td>
                      <td>{r.gender}</td>
                      <td>
                        {r.pronouns ?? <span className="text-text-muted">—</span>}
                      </td>
                      <td>
                        {r.raceEthnicity.length > 0 ? (
                          r.raceEthnicity.join(", ")
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td>{r.sexualOrientation}</td>
                      <td>
                        {r.dietaryRestrictions.length > 0 ? (
                          r.dietaryRestrictions.join(", ")
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {r.linkedinUrl ? (
                          <a
                            href={r.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ultraviolet hover:underline"
                          >
                            Profile
                          </a>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td>{r.mlhCodeOfConduct ? "Yes" : "No"}</td>
                      <td>{r.mlhDataSharing ? "Yes" : "No"}</td>
                      <td>{r.mlhEmails ? "Yes" : "No"}</td>
                      <td>
                        {/* A Google Drive link the applicant shared; opens
                            in a new tab like the LinkedIn column. */}
                        {r.resumeUrl ? (
                          <a
                            href={r.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ultraviolet hover:underline"
                          >
                            Resume
                          </a>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs text-text-secondary">
                        {formatDate(r.createdAt)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn-icon admin-btn-icon-danger"
                          aria-label={`Delete registration for ${r.firstName} ${r.lastName}`}
                          onClick={() => setPendingDelete(r)}
                        >
                          <XIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {search.trim() && (
              <p className="admin-help mt-3">
                Showing {filtered.length} of {registrations.length}
              </p>
            )}
          </>
        )}
      </Panel>

      <Modal
        open={pendingDelete !== null}
        title="Delete registration"
        onClose={deleting ? () => {} : () => setPendingDelete(null)}
      >
        <p className="font-body text-sm text-text-secondary mb-5">
          Permanently delete the registration for{" "}
          <span className="text-text-primary">
            {pendingDelete?.firstName} {pendingDelete?.lastName}
          </span>{" "}
          ({pendingDelete?.email})? This cannot be undone.
        </p>
        {actionError && <p className="admin-error">{actionError}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="admin-btn-ghost"
            onClick={() => setPendingDelete(null)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn-danger"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
