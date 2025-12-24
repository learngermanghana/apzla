import React from "react";

function MembersTab({
  memberInviteBaseUrl,
  setMemberInviteBaseUrl,
  issueMemberInviteLink,
  memberInviteLoading,
  memberInviteError,
  memberInviteLink,
  copyMemberInviteLink,
  openMemberInviteLink,
  memberInviteQr,
  downloadMemberInviteQr,
  printMemberInviteQr,
  memberForm,
  setMemberForm,
  handleCreateMember,
  loading,
  membersLoading,
  members,
  filteredMembers,
  membersHasMore,
  loadMoreMembers,
  memberSearch,
  setMemberSearch,
  editingMemberId,
  editingMemberForm,
  setEditingMemberForm,
  memberActionLoading,
  handleUpdateMember,
  cancelEditingMember,
  startEditingMember,
  handleDeleteMember,
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
        Manage your church members, visitors, and follow-ups. This is the start of
        Apzla&apos;s customer management (CRM) features.
      </p>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "18px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <div>
            <div
              style={{ fontWeight: 600, color: "#111827", marginBottom: "6px" }}
            >
              Share invite link
            </div>
            <p style={{ margin: 0, color: "#4b5563", fontSize: "14px" }}>
              Generate a public form link or QR code to collect member or visitor
              details. Submissions are added automatically to your Firebase members
              list.
            </p>
          </div>
          <div style={{ minWidth: "240px", maxWidth: "360px", width: "100%" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#374151" }}>
              Base URL
              <input
                type="text"
                value={memberInviteBaseUrl}
                onChange={(e) => setMemberInviteBaseUrl(e.target.value)}
                placeholder="https://app.example.com"
                style={{
                  marginTop: "6px",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
            </label>
            <button
              onClick={issueMemberInviteLink}
              disabled={memberInviteLoading}
              style={{
                marginTop: "8px",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "none",
                background: memberInviteLoading ? "#9ca3af" : "#111827",
                color: "white",
                cursor: memberInviteLoading ? "default" : "pointer",
                width: "100%",
                fontWeight: 600,
              }}
            >
              {memberInviteLoading ? "Issuing…" : "Issue invite link"}
            </button>
          </div>
        </div>

        {memberInviteError && (
          <div
            style={{
              marginTop: "8px",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "13px",
            }}
          >
            {memberInviteError}
          </div>
        )}

        {memberInviteLink && (
          <div
            style={{
              marginTop: "10px",
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", color: "#4b5563" }}>Invite link</div>
              <div
                style={{
                  marginTop: "4px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  background: "white",
                  wordBreak: "break-all",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {memberInviteLink}
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={copyMemberInviteLink}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={openMemberInviteLink}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: "#f3f4f6",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Open
                </button>
              </div>
            </div>

            {memberInviteQr && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <a
                  href={memberInviteLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open invite link"
                  style={{ textDecoration: "none" }}
                >
                  <img
                    src={memberInviteQr}
                    alt="Member invite QR"
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "contain",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background: "#fff",
                      padding: "8px",
                    }}
                  />
                </a>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    onClick={downloadMemberInviteQr}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      background: "white",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Download QR
                  </button>
                  <button
                    onClick={printMemberInviteQr}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      background: "white",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Print
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member form */}
      <div
        className="member-form-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "8px",
          marginBottom: "12px",
          maxWidth: "520px",
        }}
      >
        <input
          type="text"
          placeholder="First name"
          value={memberForm.firstName}
          onChange={(e) =>
            setMemberForm((f) => ({
              ...f,
              firstName: e.target.value,
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
          placeholder="Last name"
          value={memberForm.lastName}
          onChange={(e) =>
            setMemberForm((f) => ({
              ...f,
              lastName: e.target.value,
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
          placeholder="Phone"
          value={memberForm.phone}
          onChange={(e) =>
            setMemberForm((f) => ({
              ...f,
              phone: e.target.value,
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
          type="email"
          placeholder="Email"
          value={memberForm.email}
          onChange={(e) =>
            setMemberForm((f) => ({
              ...f,
              email: e.target.value,
            }))
          }
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <select
          value={memberForm.status}
          onChange={(e) =>
            setMemberForm((f) => ({
              ...f,
              status: e.target.value,
            }))
          }
          style={{
            gridColumn: "span 2",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        >
          <option value="VISITOR">Visitor</option>
          <option value="NEW_CONVERT">New Convert</option>
          <option value="REGULAR">Regular</option>
          <option value="WORKER">Worker</option>
          <option value="PASTOR">Pastor</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <button
        onClick={handleCreateMember}
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
        {loading ? "Saving..." : "Save member"}
      </button>

      <div>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          Members
        </h2>

        {membersLoading ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Loading members…</p>
        ) : members.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            No members yet. Add your first member above.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <input
                type="text"
                placeholder="Search members by name, phone, or email"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  minWidth: "260px",
                }}
              />
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch("")}
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
                Showing {filteredMembers.length} of {members.length} members
              </span>
            </div>

            <div className="members-table-wrapper" style={{ overflowX: "auto" }}>
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
                    <th style={{ padding: "6px 4px" }}>Name</th>
                    <th style={{ padding: "6px 4px" }}>Phone</th>
                    <th style={{ padding: "6px 4px" }}>Email</th>
                    <th style={{ padding: "6px 4px" }}>Status</th>
                    <th style={{ padding: "6px 4px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const isEditing = editingMemberId === m.id;
                    return (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <td style={{ padding: "6px 4px" }}>
                          {isEditing ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              <input
                                type="text"
                                value={editingMemberForm.firstName}
                                onChange={(e) =>
                                  setEditingMemberForm((f) => ({
                                    ...f,
                                    firstName: e.target.value,
                                  }))
                                }
                                placeholder="First name"
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  width: "120px",
                                }}
                              />
                              <input
                                type="text"
                                value={editingMemberForm.lastName}
                                onChange={(e) =>
                                  setEditingMemberForm((f) => ({
                                    ...f,
                                    lastName: e.target.value,
                                  }))
                                }
                                placeholder="Last name"
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  width: "120px",
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              {m.firstName} {m.lastName}
                            </>
                          )}
                        </td>
                        <td style={{ padding: "6px 4px" }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingMemberForm.phone}
                              onChange={(e) =>
                                setEditingMemberForm((f) => ({
                                  ...f,
                                  phone: e.target.value,
                                }))
                              }
                              placeholder="Phone"
                              style={{
                                padding: "6px 8px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                width: "140px",
                              }}
                            />
                          ) : (
                            <>{m.phone || "-"}</>
                          )}
                        </td>
                        <td style={{ padding: "6px 4px" }}>
                          {isEditing ? (
                            <input
                              type="email"
                              value={editingMemberForm.email}
                              onChange={(e) =>
                                setEditingMemberForm((f) => ({
                                  ...f,
                                  email: e.target.value,
                                }))
                              }
                              placeholder="Email"
                              style={{
                                padding: "6px 8px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                width: "200px",
                              }}
                            />
                          ) : (
                            <>{m.email || "-"}</>
                          )}
                        </td>
                        <td style={{ padding: "6px 4px" }}>
                          {isEditing ? (
                            <select
                              value={editingMemberForm.status}
                              onChange={(e) =>
                                setEditingMemberForm((f) => ({
                                  ...f,
                                  status: e.target.value,
                                }))
                              }
                              style={{
                                padding: "6px 8px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                              }}
                            >
                              <option value="VISITOR">Visitor</option>
                              <option value="NEW_CONVERT">New Convert</option>
                              <option value="REGULAR">Regular</option>
                              <option value="WORKER">Worker</option>
                              <option value="PASTOR">Pastor</option>
                              <option value="INACTIVE">Inactive</option>
                            </select>
                          ) : (
                            <>{m.status}</>
                          )}
                        </td>
                        <td style={{ padding: "6px 4px" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <button
                                onClick={handleUpdateMember}
                                disabled={memberActionLoading}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "#111827",
                                  color: "white",
                                  cursor: memberActionLoading ? "default" : "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                {memberActionLoading ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelEditingMember}
                                disabled={memberActionLoading}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #e5e7eb",
                                  background: "white",
                                  color: "#111827",
                                  cursor: memberActionLoading ? "default" : "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <button
                                onClick={() => startEditingMember(m)}
                                disabled={memberActionLoading}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #e5e7eb",
                                  background: "white",
                                  color: "#111827",
                                  cursor: memberActionLoading ? "default" : "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMember(m.id)}
                                disabled={memberActionLoading}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #ef4444",
                                  background: memberActionLoading ? "#fee2e2" : "#fef2f2",
                                  color: "#b91c1c",
                                  cursor: memberActionLoading ? "default" : "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {membersHasMore && members.length > 0 && (
          <button
            onClick={loadMoreMembers}
            disabled={membersLoading}
            style={{
              marginTop: "12px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              background: membersLoading ? "#f3f4f6" : "white",
              color: "#111827",
              cursor: membersLoading ? "default" : "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {membersLoading ? "Loading..." : "Load more members"}
          </button>
        )}
      </div>
    </>
  );
}

export default MembersTab;
