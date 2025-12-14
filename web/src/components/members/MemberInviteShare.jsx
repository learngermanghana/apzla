import PropTypes from "prop-types";

function MemberInviteShare({
  memberInviteLink,
  memberInviteQrUrl,
  copyMemberInviteLink,
  openMemberInviteLink,
  downloadMemberInviteQr,
  printMemberInviteQr,
}) {
  return (
    <div className="member-invite-share">
      <div className="member-invite-share__header">
        <div>
          <p className="eyebrow">Self-registration</p>
          <h3 style={{ margin: 0 }}>Invite link &amp; QR for new members</h3>
          <p className="member-invite-share__subtitle">
            Share this with visitors so they can fill the form themselves. Submissions are saved directly to your members
            list.
          </p>
        </div>
        <div className="member-invite-share__actions">
          <button onClick={copyMemberInviteLink} disabled={!memberInviteLink}>
            Copy link
          </button>
          <button onClick={openMemberInviteLink} disabled={!memberInviteLink}>
            Open link
          </button>
        </div>
      </div>

      <div className="member-invite-share__link-row">
        <input
          type="text"
          value={
            memberInviteLink || "Link a church to generate a sign-up link for members."
          }
          readOnly
        />
        <button onClick={downloadMemberInviteQr} disabled={!memberInviteQrUrl}>
          Download QR
        </button>
        <button onClick={printMemberInviteQr} disabled={!memberInviteQrUrl}>
          Print QR
        </button>
      </div>

      {memberInviteQrUrl && (
        <div className="member-invite-share__qr">
          <div className="qr-display" style={{ marginTop: "12px" }}>
            <img
              src={memberInviteQrUrl}
              alt="Member invite QR"
              className="qr-image"
              style={{ width: "160px", height: "160px" }}
            />
            <div className="qr-actions">
              <button onClick={copyMemberInviteLink}>Copy link</button>
              <button onClick={openMemberInviteLink}>Open link</button>
            </div>
            <p className="qr-caption">
              Show or print this QR code during services so visitors can register themselves.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

MemberInviteShare.propTypes = {
  memberInviteLink: PropTypes.string.isRequired,
  memberInviteQrUrl: PropTypes.string.isRequired,
  copyMemberInviteLink: PropTypes.func.isRequired,
  openMemberInviteLink: PropTypes.func.isRequired,
  downloadMemberInviteQr: PropTypes.func.isRequired,
  printMemberInviteQr: PropTypes.func.isRequired,
};

export default MemberInviteShare;
