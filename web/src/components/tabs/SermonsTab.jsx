import React from "react";

function SermonsTab({
  sermonForm,
  setSermonForm,
  handleCreateSermon,
  sermonSearch,
  setSermonSearch,
  filteredSermons,
  sermons,
  sermonsLoading,
}) {
  return (
    <>
      <p
        style={{
          marginBottom: "16px",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        Log sermons and series so your team can quickly see what was preached and when.
      </p>

      {/* Sermon form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
          marginBottom: "12px",
          maxWidth: "720px",
        }}
      >
        <input
          type="date"
          value={sermonForm.date}
          onChange={(e) => setSermonForm((f) => ({ ...f, date: e.target.value }))}
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          placeholder="Sermon title"
          value={sermonForm.title}
          onChange={(e) => setSermonForm((f) => ({ ...f, title: e.target.value }))}
          style={{
            gridColumn: "span 2",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          placeholder="Preacher"
          value={sermonForm.preacher}
          onChange={(e) => setSermonForm((f) => ({
            ...f,
            preacher: e.target.value,
          }))}
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          placeholder="Series (optional)"
          value={sermonForm.series}
          onChange={(e) => setSermonForm((f) => ({
            ...f,
            series: e.target.value,
          }))}
          style={{
            gridColumn: "span 2",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          placeholder="Scripture reference"
          value={sermonForm.scripture}
          onChange={(e) => setSermonForm((f) => ({
            ...f,
            scripture: e.target.value,
          }))}
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          placeholder="Series link (e.g. YouTube)"
          value={sermonForm.link}
          onChange={(e) => setSermonForm((f) => ({ ...f, link: e.target.value }))}
          style={{
            gridColumn: "span 2",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <textarea
          placeholder="Notes (optional)"
          value={sermonForm.notes}
          onChange={(e) => setSermonForm((f) => ({ ...f, notes: e.target.value }))}
          style={{
            gridColumn: "span 3",
            minHeight: "80px",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
      </div>

      <button
        onClick={handleCreateSermon}
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          border: "none",
          background: "#111827",
          color: "white",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        Save sermon
      </button>

      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />

      {/* Sermon list */}
      <div style={{ marginTop: "20px" }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Search sermons by title, preacher, or notes"
            value={sermonSearch}
            onChange={(e) => setSermonSearch(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              minWidth: "260px",
            }}
          />
          {sermonSearch && (
            <button
              onClick={() => setSermonSearch("")}
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Clear
            </button>
          )}
          <span style={{ color: "#6b7280", fontSize: "13px" }}>
            Showing {filteredSermons.length} of {sermons.length} sermons
          </span>
        </div>

        {sermonsLoading ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Loading sermons…
          </p>
        ) : sermons.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            No sermons logged yet. Save your first one above.
          </p>
        ) : filteredSermons.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            No sermons match your search.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <th style={{ padding: "6px 4px" }}>Date</th>
                  <th style={{ padding: "6px 4px" }}>Title</th>
                  <th style={{ padding: "6px 4px" }}>Preacher</th>
                  <th style={{ padding: "6px 4px" }}>Series</th>
                  <th style={{ padding: "6px 4px" }}>Scripture</th>
                  <th style={{ padding: "6px 4px" }}>Link</th>
                  <th style={{ padding: "6px 4px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredSermons.map((s) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <td style={{ padding: "6px 4px" }}>{s.date}</td>
                    <td style={{ padding: "6px 4px" }}>{s.title}</td>
                    <td style={{ padding: "6px 4px" }}>{s.preacher || "-"}</td>
                    <td style={{ padding: "6px 4px" }}>{s.series || "-"}</td>
                    <td style={{ padding: "6px 4px" }}>{s.scripture || "-"}</td>
                    <td style={{ padding: "6px 4px" }}>
                      {s.link ? (
                        <a href={s.link} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "6px 4px" }}>{s.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default SermonsTab;
