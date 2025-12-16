import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";

const MEMBERS_PAGE_SIZE = 25;

export function useMembers({ db, userProfile, showToast }) {
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPageCursor, setMemberPageCursor] = useState(null);
  const [membersHasMore, setMembersHasMore] = useState(true);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingMemberForm, setEditingMemberForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
  });
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberForm, setMemberForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
  });
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    setMemberPageCursor(null);
    setMembersHasMore(true);
    setMembers([]);
  }, [userProfile?.churchId]);

  const resetMembers = () => {
    setMembers([]);
    setMemberPageCursor(null);
    setMembersHasMore(true);
  };

  const memberLookup = useMemo(() => {
    const map = new Map();
    members.forEach((member) => {
      const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
      const fallback = member.email || member.phone || member.id;
      map.set(member.id, fullName || fallback);
    });
    return map;
  }, [members]);

  const loadMembers = async ({ append = false } = {}) => {
    if (!userProfile?.churchId) return;
    try {
      setMembersLoading(true);
      const colRef = collection(db, "members");
      const constraints = [
        where("churchId", "==", userProfile.churchId),
        orderBy("createdAt", "desc"),
      ];

      if (append && memberPageCursor) {
        constraints.push(startAfter(memberPageCursor));
      }

      constraints.push(limit(MEMBERS_PAGE_SIZE));

      const qMembers = query(colRef, ...constraints);
      const snapshot = await getDocs(qMembers);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers((prev) => (append ? [...prev, ...data] : data));

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setMemberPageCursor(lastDoc);
      setMembersHasMore(snapshot.docs.length === MEMBERS_PAGE_SIZE);
    } catch (err) {
      console.error("Load members error:", err);
      showToast?.("Error loading members.", "error");
    } finally {
      setMembersLoading(false);
    }
  };

  const loadMoreMembers = () => {
    if (!membersHasMore || membersLoading) return;
    return loadMembers({ append: true });
  };

  const startEditingMember = (member) => {
    setEditingMemberId(member.id);
    setEditingMemberForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      phone: member.phone || "",
      email: member.email || "",
      status: (member.status || "VISITOR").toUpperCase(),
    });
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
    setEditingMemberForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      status: "VISITOR",
    });
  };

  const handleCreateMember = async () => {
    if (!userProfile?.churchId) return;

    if (!memberForm.firstName.trim()) {
      showToast?.("First name is required.", "error");
      return;
    }

    try {
      setMemberActionLoading(true);
      await addDoc(collection(db, "members"), {
        churchId: userProfile.churchId,
        firstName: memberForm.firstName.trim(),
        lastName: memberForm.lastName.trim(),
        phone: memberForm.phone.trim(),
        email: memberForm.email.trim(),
        status: memberForm.status,
        createdAt: new Date().toISOString(),
      });

      setMemberForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        status: "VISITOR",
      });

      await loadMembers();
      showToast?.("Member saved.", "success");
    } catch (err) {
      console.error("Create member error:", err);
      showToast?.(err.message || "Unable to save member.", "error");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId || !userProfile?.churchId) return;

    if (!editingMemberForm.firstName.trim()) {
      showToast?.("First name is required.", "error");
      return;
    }

    try {
      setMemberActionLoading(true);
      const docRef = doc(db, "members", editingMemberId);
      const payload = {
        firstName: editingMemberForm.firstName.trim(),
        lastName: editingMemberForm.lastName.trim(),
        phone: editingMemberForm.phone.trim(),
        email: editingMemberForm.email.trim(),
        status: editingMemberForm.status,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, payload);

      setMembers((prev) =>
        prev.map((m) => (m.id === editingMemberId ? { ...m, ...payload } : m))
      );
      showToast?.("Member updated.", "success");
      cancelEditingMember();
    } catch (err) {
      console.error("Update member error:", err);
      showToast?.(err.message || "Unable to update member.", "error");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!userProfile?.churchId || !memberId) return;

    const confirmed = window.confirm("Delete this member? This cannot be undone.");
    if (!confirmed) return;

    try {
      setMemberActionLoading(true);
      await deleteDoc(doc(db, "members", memberId));
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      if (editingMemberId === memberId) {
        cancelEditingMember();
      }
      showToast?.("Member deleted.", "success");
    } catch (err) {
      console.error("Delete member error:", err);
      showToast?.(err.message || "Unable to delete member.", "error");
    } finally {
      setMemberActionLoading(false);
    }
  };

  return {
    members,
    membersLoading,
    memberForm,
    setMemberForm,
    memberSearch,
    setMemberSearch,
    memberLookup,
    editingMemberId,
    editingMemberForm,
    setEditingMemberForm,
    memberActionLoading,
    membersHasMore,
    loadMembers,
    loadMoreMembers,
    handleCreateMember,
    startEditingMember,
    cancelEditingMember,
    handleUpdateMember,
    handleDeleteMember,
    resetMembers,
  };
}

