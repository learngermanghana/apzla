import { useEffect, useMemo, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

const GIVING_PAGE_SIZE = 25;

export function useGiving({ db, userProfile, members, showToast }) {
  const [giving, setGiving] = useState([]);
  const [givingLoading, setGivingLoading] = useState(false);
  const [givingPageCursor, setGivingPageCursor] = useState(null);
  const [givingHasMore, setGivingHasMore] = useState(true);
  const [givingMemberFilter, setGivingMemberFilter] = useState("");
  const [givingTypeFilter, setGivingTypeFilter] = useState("all");
  const [givingDateFilter, setGivingDateFilter] = useState("all");
  const [givingSearch, setGivingSearch] = useState("");
  const [givingForm, setGivingForm] = useState({
    date: "",
    serviceType: "Sunday Service",
    type: "Offering",
    amount: "",
    notes: "",
    memberId: "",
  });

  useEffect(() => {
    setGivingPageCursor(null);
    setGivingHasMore(true);
    setGiving([]);
  }, [userProfile?.churchId]);

  const resetGiving = () => {
    setGiving([]);
    setGivingPageCursor(null);
    setGivingHasMore(true);
    setGivingMemberFilter("");
  };

  const parseGivingDate = useCallback((record) => {
    if (!record) return null;
    const rawDate = record.date || record.createdAt;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }, []);

  const givingTypeOptions = useMemo(() => {
    const uniqueTypes = new Set(["Offering", "Tithe", "Special"]);
    giving.forEach((entry) => {
      if (entry?.type) {
        uniqueTypes.add(entry.type);
      }
    });
    return Array.from(uniqueTypes);
  }, [giving]);

  const resolveGivingMember = useCallback(
    (entry) => {
      if (!entry?.memberId) return entry?.memberName || "Unknown";
      const match = members.find((m) => m.id === entry.memberId);
      if (!match) return entry?.memberName || "Member";
      return `${match.firstName || ""} ${match.lastName || ""}`.trim() || "Member";
    },
    [members]
  );

  const givingStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalAmount = 0;
    let monthAmount = 0;
    let monthCount = 0;
    const typeTotals = {};

    giving.forEach((entry) => {
      const amount = Number(entry.amount) || 0;
      totalAmount += amount;

      const parsedDate = parseGivingDate(entry);
      if (
        parsedDate &&
        parsedDate.getMonth() === currentMonth &&
        parsedDate.getFullYear() === currentYear
      ) {
        monthAmount += amount;
        monthCount += 1;
      }

      const key = entry.type || "Unspecified";
      typeTotals[key] = (typeTotals[key] || 0) + amount;
    });

    const [topType = "No records yet", topTypeAmount = 0] =
      Object.entries(typeTotals).sort((a, b) => b[1] - a[1])[0] || [];

    return {
      totalAmount,
      totalCount: giving.length,
      monthAmount,
      monthCount,
      topType,
      topTypeAmount,
    };
  }, [giving, parseGivingDate]);

  const filteredGiving = useMemo(() => {
    const searchTerm = givingSearch.trim().toLowerCase();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return giving.filter((entry) => {
      const matchesType =
        givingTypeFilter === "all" || entry.type === givingTypeFilter;
      if (!matchesType) return false;

      if (searchTerm) {
        const memberName = resolveGivingMember(entry).toLowerCase();
        const matchesSearch = [
          entry.date,
          entry.serviceType,
          entry.type,
          entry.notes,
          memberName,
        ]
          .filter(Boolean)
          .some((value) => value.toString().toLowerCase().includes(searchTerm));
        if (!matchesSearch) return false;
      }

      if (givingDateFilter === "all") return true;

      const parsedDate = parseGivingDate(entry);
      if (!parsedDate) return false;

      if (givingDateFilter === "thisMonth") {
        return parsedDate >= startOfMonth && parsedDate <= now;
      }
      if (givingDateFilter === "last30Days") {
        return parsedDate >= thirtyDaysAgo && parsedDate <= now;
      }
      if (givingDateFilter === "thisYear") {
        return parsedDate >= startOfYear && parsedDate <= now;
      }

      return true;
    });
  }, [giving, givingDateFilter, givingSearch, givingTypeFilter, parseGivingDate, resolveGivingMember]);

  const loadGiving = async ({ append = false, memberId = givingMemberFilter } = {}) => {
    if (!userProfile?.churchId) return;
    try {
      setGivingLoading(true);
      const colRef = collection(db, "giving");
      const constraints = [
        where("churchId", "==", userProfile.churchId),
      ];

      if (memberId) {
        constraints.push(where("memberId", "==", memberId));
      }

      constraints.push(orderBy("createdAt", "desc"));

      if (append && givingPageCursor) {
        constraints.push(startAfter(givingPageCursor));
      }

      constraints.push(limit(GIVING_PAGE_SIZE));

      const qGiving = query(colRef, ...constraints);
      const snapshot = await getDocs(qGiving);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGiving((prev) => (append ? [...prev, ...data] : data));

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setGivingPageCursor(lastDoc);
      setGivingHasMore(snapshot.docs.length === GIVING_PAGE_SIZE);
    } catch (err) {
      console.error("Load giving error:", err);
      showToast?.("Error loading giving records.", "error");
    } finally {
      setGivingLoading(false);
    }
  };

  const loadMoreGiving = () => {
    if (!givingHasMore || givingLoading) return;
    return loadGiving({ append: true });
  };

  const handleCreateGiving = async () => {
    if (!userProfile?.churchId) return;

    if (!givingForm.date) {
      showToast?.("Please select a date.", "error");
      return;
    }
    if (!givingForm.amount) {
      showToast?.("Please enter an amount.", "error");
      return;
    }

    try {
      setGivingLoading(true);
      const selectedMember =
        givingForm.memberId && members.find((m) => m.id === givingForm.memberId);
      const memberName = selectedMember
        ? `${selectedMember.firstName || ""} ${selectedMember.lastName || ""}`.trim()
        : "";
      await addDoc(collection(db, "giving"), {
        churchId: userProfile.churchId,
        date: givingForm.date,
        serviceType: givingForm.serviceType.trim() || "Service",
        type: givingForm.type,
        amount: Number(givingForm.amount),
        notes: givingForm.notes.trim(),
        memberId: givingForm.memberId || null,
        memberName,
        createdAt: new Date().toISOString(),
      });

      setGivingForm((prev) => ({
        ...prev,
        date: new Date().toISOString().slice(0, 10),
        serviceType: "Sunday Service",
        type: "Offering",
        amount: "",
        notes: "",
        memberId: "",
      }));

      await loadGiving();
      showToast?.("Giving record saved.", "success");
    } catch (err) {
      console.error("Create giving error:", err);
      showToast?.(err.message || "Unable to save giving record.", "error");
    } finally {
      setGivingLoading(false);
    }
  };

  return {
    giving,
    givingLoading,
    givingHasMore,
    givingMemberFilter,
    setGivingMemberFilter,
    givingTypeFilter,
    setGivingTypeFilter,
    givingDateFilter,
    setGivingDateFilter,
    givingSearch,
    setGivingSearch,
    givingForm,
    setGivingForm,
    givingTypeOptions,
    givingStats,
    filteredGiving,
    loadGiving,
    loadMoreGiving,
    handleCreateGiving,
    resolveGivingMember,
    resetGiving,
  };
}

