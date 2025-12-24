import React from "react";

function AttendanceTab({
  userProfile,
  attendanceForm,
  setAttendanceForm,
  handleCreateAttendance,
  loading,
  attendanceLoading,
  combinedAttendanceRecords,
  handleOverrideAttendance,
  recentMemberCheckins,
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
        Record attendance for each service. This helps you track growth over time for{" "}
        <strong>{userProfile.churchName}</strong>.
      </p>

      {/* Attendance form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
          marginBottom: "12px",
          maxWidth: "620px",
        }}
      >
        <input
          type="date"
          value={attendanceForm.date}
          onChange={(e) =>
            setAttendanceForm((f) => ({
              ...f,
              date: e.target.value,
            }))
          }
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          placeholder="Service type (e.g. Sunday Service)"
          value={attendanceForm.serviceType}
          onChange={(e) =>
            setAttendanceForm((f) => ({
              ...f,
              serviceType: e.target.value,
            }))
          }
          style={{
            gridColumn: "span 2",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />

        <input
          type="number"
          min="0"
          placeholder="Adults"
          value={attendanceForm.adults}
          onChange={(e) =>
            setAttendanceForm((f) => ({
              ...f,
              adults: e.target.value,
            }))
          }
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="number"
          min="0"
          placeholder="Children"
          value={attendanceForm.children}
          onChange={(e) =>
            setAttendanceForm((f) => ({
              ...f,
              children: e.target.value,
            }))
          }
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="number"
          min="0"
          placeholder="Visitors"
          value={attendanceForm.visitors}
          onChange={(e) =>
            setAttendanceForm((f) => ({
              ...f,
              visitors: e.target.value,
            }))
          }
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />

        <textarea
          placeholder="Notes (optional)"
          value={attendanceForm.notes}
          onChange={(e) =>
            setAttendanceForm((f) => ({
              ...f,
              notes: e.target.value,
            }))
          }
          rows={2}
          style={{
            gridColumn: "span 3",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
            resize: "vertical",
          }}
        />
      </div>

      <button
        onClick={handleCreateAttendance}
        disabled={loading}
        style={{
          padding: "8px 14px",
          borderRadius: "8px",
          border: "none",
          background: loading ? "#6b7280" : "#111827",
          color: "white",
          cursor: loading ? "default" : "pointer",
          fontSize: "14px",
          fontWeight: 500,
          marginBottom: "16px",
        }}
      >
        {loading ? "Saving..." : "Save attendance"}
      </button>

      <div>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          Attendance records
        </h2>

        {attendanceLoading ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Loading attendance…</p>
        ) : combinedAttendanceRecords.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            No attendance records yet. Save your first one above.
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
                  <th style={{ padding: "6px 4px" }}>Service</th>
                  <th style={{ padding: "6px 4px" }}>Adults</th>
                  <th style={{ padding: "6px 4px" }}>Children</th>
                  <th style={{ padding: "6px 4px" }}>Visitors</th>
                  <th style={{ padding: "6px 4px" }}>Self check-ins</th>
                  <th style={{ padding: "6px 4px" }}>Total</th>
                  <th style={{ padding: "6px 4px" }}>Notes</th>
                  <th style={{ padding: "6px 4px" }}>Source</th>
                  <th style={{ padding: "6px 4px" }}></th>
                </tr>
              </thead>
              <tbody>
                {combinedAttendanceRecords.map((a) => (
                  <tr
                    key={a.key}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <td style={{ padding: "6px 4px" }}>{a.date}</td>
                    <td style={{ padding: "6px 4px" }}>{a.serviceType}</td>
                    <td style={{ padding: "6px 4px" }}>{a.adults ?? 0}</td>
                    <td style={{ padding: "6px 4px" }}>{a.children ?? 0}</td>
                    <td style={{ padding: "6px 4px" }}>{a.visitors ?? 0}</td>
                    <td style={{ padding: "6px 4px" }}>{a.selfCheckins ?? 0}</td>
                    <td style={{ padding: "6px 4px" }}>{a.total}</td>
                    <td style={{ padding: "6px 4px" }}>{a.notes || "-"}</td>
                    <td
                      style={{
                        padding: "6px 4px",
                        color: "#6b7280",
                        textTransform: "capitalize",
                      }}
                    >
                      {a.sourceLabel || "-"}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <button
                        onClick={() => handleOverrideAttendance(a)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #d1d5db",
                          background: "white",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: "18px" }}>
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          Recent member check-ins
        </h3>
        {recentMemberCheckins.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            No member check-ins yet. Self-check-ins and usher check-ins will appear here.
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
                  <th style={{ padding: "6px 4px" }}>Member</th>
                  <th style={{ padding: "6px 4px" }}>Service</th>
                  <th style={{ padding: "6px 4px" }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {recentMemberCheckins.map((entry) => (
                  <tr
                    key={`${entry.memberId}-${entry.date}-${entry.serviceType}`}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td style={{ padding: "6px 4px" }}>{entry.date}</td>
                    <td style={{ padding: "6px 4px" }}>{entry.memberName}</td>
                    <td style={{ padding: "6px 4px" }}>
                      {entry.serviceType || "Service"}
                    </td>
                    <td style={{ padding: "6px 4px", textTransform: "capitalize" }}>
                      {entry.source?.toLowerCase() || "-"}
                    </td>
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

export default AttendanceTab;
